// pages/LoginPage.jsx — UPDATED
// Changes from original:
//   1. Added "View Campus Board →" link so visitors can find the public board
//      without needing to log in.
//   2. Student role redirect now goes to /student/complaints (unchanged).
// Everything else identical to uploaded repo version.

import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('phone');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated && user) {
        if (user.role === 'Admin')   return <Navigate to="/admin" replace />;
        if (user.role === 'Student') return <Navigate to="/student/complaints" replace />;
        return <Navigate to="/worker/attendance" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const credentials = mode === 'phone' ? { phone, password } : { email, password };
            const data = await login(credentials);
            if (data.user?.role === 'Admin')        navigate('/admin', { replace: true });
            else if (data.user?.role === 'Student') navigate('/student/complaints', { replace: true });
            else                                    navigate('/worker/attendance', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Facility Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>

                    {/* NEW: Public board link for unauthenticated visitors */}
                    <Link
                        to="/board"
                        className="inline-flex items-center gap-1.5 mt-3 text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    >
                        View campus complaints board
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-800/60 rounded-xl p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => setMode('phone')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                mode === 'phone'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Phone
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('email')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                mode === 'email'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Email
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'phone' ? (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="Enter your phone number"
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-4 space-y-2">
                    <p className="text-slate-500 text-sm">
                        Student?{' '}
                        <Link to="/register" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                            Register here
                        </Link>
                    </p>
                    <p className="text-slate-700 text-xs">
                        Contact your administrator for Worker / Admin account access
                    </p>
                </div>
            </div>
        </div>
    );
}
