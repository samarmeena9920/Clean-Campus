// layouts/StudentLayout.jsx — UPDATED
// Changes from original:
//   1. Added "Campus Board" nav item → /board (public complaints dashboard)
//   2. Added "Profile" nav item → /student/profile (building selection)
// Everything else identical.

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
    {
        to: '/student/complaints',
        label: 'My Issues',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
    },
    {
        to: '/student/complaints/new',
        label: 'Report',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v16m8-8H4" />
            </svg>
        ),
    },
    {
        // Links to the board — now nested in student routes so sidebar shows
        to: '/student/board',
        label: 'Board',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7h18M3 12h18M3 17h18" />
            </svg>
        ),
    },
];

export default function StudentLayout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Left Sidebar */}
            <aside className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col fixed left-0 top-0 h-screen z-50">
                {/* Logo & User Info */}
                <div className="p-4 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                            CC
                        </div>
                        <div>
                            <p className="text-white text-sm font-semibold leading-tight">{user?.name}</p>
                            <p className="text-slate-500 text-xs">Student</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/student/complaints'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    isActive
                                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 ml-64 flex flex-col">
                {/* Top Bar */}
                <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
                    <p className="text-slate-400 text-sm">Welcome back, {user?.name}</p>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
