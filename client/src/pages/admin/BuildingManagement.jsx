// pages/admin/BuildingManagement.jsx
// Task 3: Admin UI for managing dynamic building configurations.
// Matches the exact dark slate design of ComplaintsAdminPage, UsersPage etc.
//
// Features:
//   - Create building with tag-input for blocks, floors, area types
//   - Edit inline (expand row to show edit form)
//   - Soft delete (deactivate) with toggle to reactivate
//   - Live preview of cascading values as admin types them

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

// ─── Tag Input component ──────────────────────────────────────────────────────
// Press Enter or comma to add a tag, click × to remove it.
function TagInput({ label, tags, onChange, placeholder }) {
    const [inputVal, setInputVal] = useState('');

    const add = (raw) => {
        const val = raw.trim();
        if (!val || tags.includes(val)) return;
        onChange([...tags, val]);
        setInputVal('');
    };

    const remove = (tag) => onChange(tags.filter((t) => t !== tag));

    const handleKey = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(inputVal);
        } else if (e.key === 'Backspace' && !inputVal && tags.length) {
            remove(tags[tags.length - 1]);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                {label}
            </label>
            <div className="min-h-[44px] px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                onClick={() => document.getElementById(`tag-input-${label}`)?.focus()}>
                {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-200 text-xs rounded-lg">
                        {tag}
                        <button type="button" onClick={() => remove(tag)}
                            className="text-slate-400 hover:text-red-400 transition-colors leading-none">×</button>
                    </span>
                ))}
                <input
                    id={`tag-input-${label}`}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKey}
                    onBlur={() => { if (inputVal.trim()) add(inputVal); }}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder-slate-600"
                />
            </div>
            <p className="text-slate-600 text-[10px]">Press Enter or comma to add. Backspace to remove last.</p>
        </div>
    );
}

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', blocks: ['None'], floors: [], areaTypes: [] };

export default function BuildingManagement() {
    const [buildings, setBuildings]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showCreate, setShowCreate]   = useState(false);
    const [form, setForm]               = useState(EMPTY_FORM);
    const [creating, setCreating]       = useState(false);
    const [createError, setCreateError] = useState('');

    // Edit state — which building is being edited
    const [editId, setEditId]         = useState(null);
    const [editForm, setEditForm]     = useState(EMPTY_FORM);
    const [saving, setSaving]         = useState(false);
    const [saveError, setSaveError]   = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/buildings');
            setBuildings(data.data || []);
        } catch (err) {
            console.error('[buildings]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Create ────────────────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setCreateError('Building name is required'); return; }
        setCreating(true);
        setCreateError('');
        try {
            await api.post('/api/admin/buildings', form);
            setForm(EMPTY_FORM);
            setShowCreate(false);
            await load();
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to create building');
        } finally {
            setCreating(false);
        }
    };

    // ── Start editing ─────────────────────────────────────────────────────────
    const startEdit = (building) => {
        setEditId(building._id);
        setEditForm({
            name:      building.name,
            blocks:    [...building.blocks],
            floors:    [...building.floors],
            areaTypes: [...building.areaTypes],
            isActive:  building.isActive,
        });
        setSaveError('');
    };

    const cancelEdit = () => { setEditId(null); setSaveError(''); };

    // ── Save edit ─────────────────────────────────────────────────────────────
    const handleSave = async (id) => {
        setSaving(true);
        setSaveError('');
        try {
            await api.put(`/api/admin/buildings/${id}`, editForm);
            setEditId(null);
            await load();
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // ── Soft delete / reactivate ──────────────────────────────────────────────
    const handleToggleActive = async (building) => {
        try {
            if (building.isActive) {
                await api.delete(`/api/admin/buildings/${building._id}`);
            } else {
                await api.put(`/api/admin/buildings/${building._id}`, { isActive: true });
            }
            await load();
        } catch (err) {
            console.error('[toggle building]', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Building Management</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Configure buildings and their cascading location options
                    </p>
                </div>
                <button
                    onClick={() => { setShowCreate(!showCreate); setCreateError(''); }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    {showCreate ? '✕ Cancel' : '+ Add Building'}
                </button>
            </div>

            {/* ── Create Form ── */}
            {showCreate && (
                <form onSubmit={handleCreate}
                    className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                    <h3 className="text-white font-medium">New Building</h3>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Building Name *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Main Academic Building"
                            required
                            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <TagInput
                        label="Blocks"
                        tags={form.blocks}
                        onChange={(t) => setForm({ ...form, blocks: t })}
                        placeholder="e.g. Block A, Block B, None"
                    />
                    <TagInput
                        label="Floors"
                        tags={form.floors}
                        onChange={(t) => setForm({ ...form, floors: t })}
                        placeholder="e.g. Ground Floor, First Floor"
                    />
                    <TagInput
                        label="Area Types"
                        tags={form.areaTypes}
                        onChange={(t) => setForm({ ...form, areaTypes: t })}
                        placeholder="e.g. Washroom, Corridor, Classroom"
                    />

                    {createError && (
                        <p className="text-red-400 text-sm">{createError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={creating}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                        {creating ? 'Creating...' : 'Create Building'}
                    </button>
                </form>
            )}

            {/* ── Buildings List ── */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : buildings.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-slate-500 text-sm">
                        No buildings configured yet. Add one to enable dynamic location selection in the complaint form.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {buildings.map((b) => {
                        const isEditing = editId === b._id;
                        return (
                            <div
                                key={b._id}
                                className={`bg-slate-900/60 border rounded-2xl overflow-hidden transition-all ${
                                    b.isActive ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
                                }`}
                            >
                                {/* Row header */}
                                <div className="p-4 flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-medium text-sm">{b.name}</p>
                                            {!b.isActive && (
                                                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded-md">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {/* Preview chips */}
                                        <div className="flex flex-wrap gap-1">
                                            {b.blocks.filter(bl => bl !== 'None').map((bl) => (
                                                <span key={bl} className="px-1.5 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] rounded">
                                                    {bl}
                                                </span>
                                            ))}
                                            {b.floors.slice(0, 3).map((fl) => (
                                                <span key={fl} className="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] rounded">
                                                    {fl}
                                                </span>
                                            ))}
                                            {b.areaTypes.slice(0, 4).map((at) => (
                                                <span key={at} className="px-1.5 py-0.5 bg-teal-500/15 text-teal-400 text-[10px] rounded">
                                                    {at}
                                                </span>
                                            ))}
                                            {(b.blocks.filter(x => x !== 'None').length + b.floors.length + b.areaTypes.length) > 7 && (
                                                <span className="text-slate-600 text-[10px] self-center">…</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => isEditing ? cancelEdit() : startEdit(b)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                                        >
                                            {isEditing ? 'Cancel' : 'Edit'}
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(b)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                                b.isActive
                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                            }`}
                                        >
                                            {b.isActive ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                    </div>
                                </div>

                                {/* Inline edit form */}
                                {isEditing && (
                                    <div className="border-t border-slate-800 p-4 space-y-4 bg-slate-800/20">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                                                Building Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <TagInput
                                            label="Blocks"
                                            tags={editForm.blocks}
                                            onChange={(t) => setEditForm({ ...editForm, blocks: t })}
                                            placeholder="Add block…"
                                        />
                                        <TagInput
                                            label="Floors"
                                            tags={editForm.floors}
                                            onChange={(t) => setEditForm({ ...editForm, floors: t })}
                                            placeholder="Add floor…"
                                        />
                                        <TagInput
                                            label="Area Types"
                                            tags={editForm.areaTypes}
                                            onChange={(t) => setEditForm({ ...editForm, areaTypes: t })}
                                            placeholder="Add area type…"
                                        />
                                        {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
                                        <button
                                            onClick={() => handleSave(b._id)}
                                            disabled={saving}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
