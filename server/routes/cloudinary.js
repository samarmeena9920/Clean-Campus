const express = require('express');
const cloudinary = require('cloudinary').v2;
const protect = require('../middleware/auth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── POST /api/cloudinary/sign ────────────────────────────────────────────────
/**
 * Generates a short-lived Cloudinary upload signature.
 * The React frontend uses this to upload images DIRECTLY to Cloudinary,
 * keeping binary data off our Express server ("5 PM Sync Crash" prevention).
 *
 * Body: { folder?, publicId? }   — both optional
 * Returns: { signature, timestamp, cloudName, apiKey }
 */
router.post('/sign', protect(), async (req, res, next) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);

    // Build the params that will be signed (must match what the client sends)
    const paramsToSign = {
      timestamp,
      folder: req.body.folder || `facility/${req.user.employeeCode}`,
    };

    if (req.body.publicId) {
      paramsToSign.public_id = req.body.publicId;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      success:   true,
      signature,
      timestamp,
      folder:    paramsToSign.folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
