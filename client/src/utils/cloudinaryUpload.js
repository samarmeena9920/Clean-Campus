import api from './api';

/**
 * Direct-to-Cloudinary Upload
 *
 * Flow:
 * 1. Request a presigned signature from our backend (/api/cloudinary/sign)
 * 2. POST the image blob directly to Cloudinary's upload endpoint
 * 3. Return the secure URL — no binary data ever touches our Express server
 *
 * This prevents the "5 PM Sync Crash" when dozens of workers sync photos at once.
 */

/**
 * Upload a single image blob directly to Cloudinary.
 * @param {Blob} blob - The image blob (from camera capture or IndexedDB)
 * @param {object} options - { folder?, publicId? }
 * @returns {Promise<string>} The secure Cloudinary URL
 */
export async function uploadToCloudinary(blob, options = {}) {
  // 1. Get presigned signature from our backend
  const { data: signData } = await api.post('/api/cloudinary/sign', {
    folder: options.folder,
    publicId: options.publicId,
  });

  if (!signData.success) {
    throw new Error('Failed to get Cloudinary signature');
  }

  // 2. Build the FormData for direct upload to Cloudinary
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('api_key', signData.apiKey);
  formData.append('timestamp', signData.timestamp);
  formData.append('signature', signData.signature);
  formData.append('folder', signData.folder);

  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  // 3. Upload directly to Cloudinary (bypasses our Express server entirely)
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;

  const response = await fetch(cloudinaryUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Cloudinary upload failed (${response.status})`);
  }

  const result = await response.json();
  return result.secure_url;
}

/**
 * Upload multiple image blobs in sequence.
 * Returns an array of { field, url } objects.
 *
 * @param {Array<{ blob: Blob, field: string }>} images
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Array<{ field: string, url: string }>>}
 */
export async function uploadMultipleImages(images, folder) {
  const results = [];

  for (const { blob, field } of images) {
    try {
      const url = await uploadToCloudinary(blob, { folder });
      results.push({ field, url });
    } catch (err) {
      console.error(`[cloudinary] Failed to upload ${field}:`, err.message);
      results.push({ field, url: null, error: err.message });
    }
  }

  return results;
}

export default { uploadToCloudinary, uploadMultipleImages };
