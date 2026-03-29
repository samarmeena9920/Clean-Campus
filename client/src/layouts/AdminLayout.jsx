// layouts/AdminLayout.jsx — UPDATED
// Change: added Buildings nav item linking to /admin/buildings
// Everything else identical to the existing AdminLayout.jsx

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/admin',            label: 'Overview',    icon: '📊', end: true },
    { to: '/admin/complaints', label: 'Complaints',  icon: '📋' },
    { to: '/admin/buildings',  label: 'Buildings',   icon: '🏢' }, // ← NEW
    { to: '/admin/roster',     label: 'Roster',      icon: '📍' },
    { to: '/admin/tasks',      label: 'Task Audit',  icon: '🖼️' },
    { to: '/admin/inventory',  label: 'Inventory',   icon: '📦' },
    { to: '/admin/users',      label: 'Users',       icon: '👥' },
    { to: '/admin/flagged',    label: 'Flagged',     icon: '⚠️' },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu  = () => setIsMobileMenuOpen(false);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white text-xs font-bold shadow-lg">FM</div>
                    <p className="text-white text-sm font-bold">Facility Mgmt</p>
                </div>
                <button onClick={toggleMenu} className="p-2 text-slate-400 hover:text-white focus:outline-none">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                    </svg>
                </button>
            </header>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={closeMenu} />
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Brand Desktop */}
                <div className="hidden md:block px-5 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/25">FM</div>
                        <div>
                            <p className="text-white text-sm font-bold">Facility Mgmt</p>
                            <p className="text-slate-500 text-[10px]">Admin Dashboard</p>
                        </div>
                    </div>
                </div>

                {/* Mobile menu header */}
                <div className="h-16 border-b border-slate-800 md:hidden flex items-center px-4">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Menu</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={closeMenu}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-blue-600/15 text-blue-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`
                            }
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-4 py-4 border-t border-slate-800 bg-slate-900 md:bg-transparent">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold shrink-0">
                            {user?.name?.[0] || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-slate-500 text-[10px] truncate">{user?.employeeCode}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full py-2 bg-slate-800/80 hover:bg-red-600/20 hover:text-red-400 text-slate-400 text-xs font-medium rounded-lg transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 w-full md:pl-64 flex flex-col min-h-[calc(100vh-64px)] md:min-h-screen">
                <div className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden w-full max-w-[100vw]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
