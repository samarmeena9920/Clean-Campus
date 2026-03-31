// pages/admin/UsersPage.jsx — UPDATED
// Changes from original:
//   1. Student role shown with a distinct purple badge (was missing entirely)
//   2. Contact column shows email for students, phone for workers
//   3. Students created via self-registration now visible with correct role label
// Everything else (create form, activate/deactivate, table layout) unchanged.

import { useState, useEffect } from 'react';
import api from '../../utils/api';

// Role badge colours — extends original (only had Worker + Admin)
const ROLE_STYLES = {
    Admin:   'bg-purple-500/15 text-purple-400',
    Worker:  'bg-blue-500/15 text-blue-400',
    Student: 'bg-pink-500/15 text-pink-400',   // NEW
};

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [selectedCreateBuilding, setSelectedCreateBuilding] = useState('');
    const [selectedCreateBlock, setSelectedCreateBlock] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        name: '', phone: '', email: '', password: '',
        role: 'Worker', assignedAreas: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '', phone: '', email: '', assignedAreas: '',
    });
    const [selectedEditBuilding, setSelectedEditBuilding] = useState('');
    const [selectedEditBlock, setSelectedEditBlock] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingCode, setDeletingCode] = useState('');
    const [deleteCandidate, setDeleteCandidate] = useState(null);

    // Filter state — lets admin see only one role at a time
    const [roleFilter, setRoleFilter] = useState('Worker');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/users');
            setUsers(data.data || []);
        } catch (err) {
            console.error('[users]', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const loadBuildings = async () => {
            try {
                const { data } = await api.get('/api/buildings');
                setBuildings(data.data || []);
            } catch (err) {
                console.error('[buildings]', err);
            }
        };
        loadBuildings();
    }, []);

    const selectedCreateBuildingData = buildings.find((b) => b.name === selectedCreateBuilding);
    const createBlocks = (selectedCreateBuildingData?.blocks || []).filter((b) => b !== 'None');

    const selectedEditBuildingData = buildings.find((b) => b.name === selectedEditBuilding);
    const editBlocks = (selectedEditBuildingData?.blocks || []).filter((b) => b !== 'None');

    const handleCreate = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        try {
            const payload = {
                ...form,
                assignedAreas: form.assignedAreas
                    .split(',')
                    .map((a) => a.trim())
                    .filter(Boolean),
            };
            const { data } = await api.post('/api/auth/register', payload);
            setSuccess(`Created: ${data.user.employeeCode} — ${data.user.name}`);
            setForm({ name: '', phone: '', email: '', password: '', role: 'Worker', assignedAreas: '' });
            setSelectedCreateBuilding('');
            setSelectedCreateBlock('');
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        }
    };

    const addCreateLocation = () => {
        if (!selectedCreateBuilding) return;

        const location = selectedCreateBlock
            ? `${selectedCreateBuilding} - ${selectedCreateBlock}`
            : selectedCreateBuilding;

        const current = form.assignedAreas
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);

        if (!current.includes(location)) {
            setForm((prev) => ({ ...prev, assignedAreas: [...current, location].join(', ') }));
        }
    };

    const toggleActive = async (user) => {
        try {
            await api.patch(`/api/admin/users/${user.employeeCode}`, { isActive: !user.isActive });
            load();
        } catch (err) {
            console.error('[toggle]', err);
        }
    };

    const askDeleteWorker = (user) => {
        if (user.role !== 'Worker') return;
        setDeleteCandidate(user);
    };

    const confirmDeleteWorker = async () => {
        if (!deleteCandidate) return;

        setError('');
        setSuccess('');
        setDeletingCode(deleteCandidate.employeeCode);
        try {
            await api.delete(`/api/admin/users/${deleteCandidate.employeeCode}`);
            setSuccess(`Deleted worker: ${deleteCandidate.employeeCode} — ${deleteCandidate.name}`);
            await load();
            setDeleteCandidate(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete worker');
        } finally {
            setDeletingCode('');
        }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setEditForm({
            name: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            assignedAreas: (user.assignedAreas || []).join(', '),
        });
        setError('');
        setSuccess('');
        setSelectedEditBuilding('');
        setSelectedEditBlock('');
    };

    const toggleAreaTag = (area) => {
        const current = editForm.assignedAreas
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);

        const next = current.includes(area)
            ? current.filter((a) => a !== area)
            : [...current, area];

        setEditForm((prev) => ({ ...prev, assignedAreas: next.join(', ') }));
    };

    const addEditLocation = () => {
        if (!selectedEditBuilding) return;

        const location = selectedEditBlock
            ? `${selectedEditBuilding} - ${selectedEditBlock}`
            : selectedEditBuilding;

        const current = editForm.assignedAreas
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean);

        if (!current.includes(location)) {
            setEditForm((prev) => ({ ...prev, assignedAreas: [...current, location].join(', ') }));
        }
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        setSavingEdit(true);
        setError('');
        setSuccess('');
        try {
            const payload = {
                name: editForm.name.trim(),
                phone: editForm.phone.trim() || undefined,
                email: editForm.email.trim() || undefined,
                assignedAreas: editForm.assignedAreas
                    .split(',')
                    .map((a) => a.trim())
                    .filter(Boolean),
            };

            await api.patch(`/api/admin/users/${editingUser.employeeCode}`, payload);
            setSuccess(`Updated: ${editingUser.employeeCode}`);
            setEditingUser(null);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user');
        } finally {
            setSavingEdit(false);
        }
    };

    // Apply role filter
    const filtered = roleFilter === 'all'
        ? users
        : users.filter((u) => u.role === roleFilter);

    // Count per role for filter pills
    const counts = users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-slate-400 text-sm mt-1">{users.length} registered users</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                    + Register Worker
                </button>
            </div>

            {/* Role filter pills */}
            <div className="flex gap-2 flex-wrap">
                {[['all', 'All', users.length], ['Worker', 'Workers', counts.Worker || 0], ['Admin', 'Admins', counts.Admin || 0], ['Student', 'Students', counts.Student || 0]].map(([val, label, count]) => (
                    <button
                        key={val}
                        onClick={() => setRoleFilter(val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            roleFilter === val
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        {label} <span className="opacity-60 ml-0.5">{count}</span>
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <form
                    onSubmit={handleCreate}
                    className="bg-slate-900/60 border border-blue-500/30 rounded-2xl p-4 md:p-5 space-y-4"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Full Name *"
                            required
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="Phone *"
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="Email (optional)"
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Password *"
                            type="password"
                            required
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            value={form.assignedAreas}
                            onChange={(e) => setForm({ ...form, assignedAreas: e.target.value })}
                            placeholder="Areas (comma-separated)"
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Worker">Worker</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {form.role === 'Worker' && (
                        <div className="space-y-2">
                            <p className="text-slate-300 text-sm font-medium">Assign Worker Location</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <select
                                    value={selectedCreateBuilding}
                                    onChange={(e) => {
                                        setSelectedCreateBuilding(e.target.value);
                                        setSelectedCreateBlock('');
                                    }}
                                    className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select building</option>
                                    {buildings.map((b) => (
                                        <option key={b._id || b.name} value={b.name}>{b.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedCreateBlock}
                                    onChange={(e) => setSelectedCreateBlock(e.target.value)}
                                    disabled={!selectedCreateBuilding || createBlocks.length === 0}
                                    className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    <option value="">{createBlocks.length ? 'Select block (optional)' : 'No blocks available'}</option>
                                    {createBlocks.map((block) => (
                                        <option key={block} value={block}>{block}</option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={addCreateLocation}
                                    disabled={!selectedCreateBuilding}
                                    className="px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl disabled:opacity-50"
                                >
                                    Add Location
                                </button>
                            </div>
                        </div>
                    )}
                    {error   && <p className="text-red-400 text-sm">{error}</p>}
                    {success && <p className="text-emerald-400 text-sm">{success}</p>}
                    <button
                        type="submit"
                        className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        Create Account
                    </button>
                </form>
            )}

            {/* User Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
                    <p className="text-slate-500 text-sm">No {roleFilter === 'all' ? '' : roleFilter.toLowerCase() + ' '}users found.</p>
                </div>
            ) : (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-5 py-3">Code</th>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Contact</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Areas / Building</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u) => (
                                    <tr
                                        key={u._id}
                                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="px-5 py-3.5 text-blue-400 text-sm font-mono font-medium">
                                            {u.employeeCode}
                                        </td>
                                        <td className="px-5 py-3.5 text-white text-sm">{u.name}</td>
                                        {/* Contact — show email for students, phone for workers */}
                                        <td className="px-5 py-3.5 text-slate-400 text-sm">
                                            {u.role === 'Student'
                                                ? u.email || '—'
                                                : u.phone || u.email || '—'
                                            }
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_STYLES[u.role] || 'bg-slate-700 text-slate-300'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {u.assignedAreas?.length
                                                    ? u.assignedAreas.map((a) => (
                                                        <span
                                                            key={a}
                                                            className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-md"
                                                        >
                                                            {a}
                                                        </span>
                                                    ))
                                                    : <span className="text-slate-600 text-xs">—</span>
                                                }
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                u.isActive
                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                    : 'bg-red-500/15 text-red-400'
                                            }`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(u)}
                                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                                        u.isActive
                                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                    }`}
                                                >
                                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                                {u.role === 'Worker' && (
                                                    <button
                                                        onClick={() => askDeleteWorker(u)}
                                                        disabled={deletingCode === u.employeeCode}
                                                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                                    >
                                                        {deletingCode === u.employeeCode ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={saveEdit}
                        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white text-lg font-semibold">Edit User</h3>
                                <p className="text-slate-500 text-xs mt-1">
                                    {editingUser.employeeCode} • {editingUser.role}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                                value={editForm.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Full Name"
                                required
                                className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                value={editForm.phone}
                                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                                placeholder="Phone"
                                className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                value={editForm.email}
                                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="Email"
                                className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm text-slate-300">Assigned Areas / Buildings</label>
                            <input
                                value={editForm.assignedAreas}
                                onChange={(e) => setEditForm((p) => ({ ...p, assignedAreas: e.target.value }))}
                                placeholder="Comma separated areas/buildings"
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {editingUser.role === 'Worker' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select
                                        value={selectedEditBuilding}
                                        onChange={(e) => {
                                            setSelectedEditBuilding(e.target.value);
                                            setSelectedEditBlock('');
                                        }}
                                        className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select building</option>
                                        {buildings.map((b) => (
                                            <option key={b._id || b.name} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={selectedEditBlock}
                                        onChange={(e) => setSelectedEditBlock(e.target.value)}
                                        disabled={!selectedEditBuilding || editBlocks.length === 0}
                                        className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <option value="">{editBlocks.length ? 'Select block (optional)' : 'No blocks available'}</option>
                                        {editBlocks.map((block) => (
                                            <option key={block} value={block}>{block}</option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={addEditLocation}
                                        disabled={!selectedEditBuilding}
                                        className="px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl disabled:opacity-50"
                                    >
                                        Add Location
                                    </button>
                                </div>
                            )}
                            {buildings.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {buildings.map((b) => {
                                        const active = editForm.assignedAreas
                                            .split(',')
                                            .map((a) => a.trim())
                                            .filter(Boolean)
                                            .includes(b.name);
                                        return (
                                            <button
                                                key={b._id || b.name}
                                                type="button"
                                                onClick={() => toggleAreaTag(b.name)}
                                                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                                                    active
                                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                {b.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 rounded-xl text-sm bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingEdit}
                                className="px-4 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                {savingEdit ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {deleteCandidate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div>
                            <h3 className="text-white text-lg font-semibold">Delete Worker</h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Are you sure you want to delete this worker?
                            </p>
                        </div>

                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                            <p className="text-white text-sm font-medium">{deleteCandidate.name}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{deleteCandidate.employeeCode}</p>
                        </div>

                        <p className="text-rose-400 text-xs">
                            This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setDeleteCandidate(null)}
                                className="px-4 py-2 rounded-xl text-sm bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteWorker}
                                disabled={deletingCode === deleteCandidate.employeeCode}
                                className="px-4 py-2 rounded-xl text-sm bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
                            >
                                {deletingCode === deleteCandidate.employeeCode ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
