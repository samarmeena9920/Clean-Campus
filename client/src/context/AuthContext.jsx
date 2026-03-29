import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages JWT session with persistent login.
 *
 * On app load:
 * 1. Checks localStorage for an existing token
 * 2. Calls GET /api/auth/me to validate it
 * 3. If valid → auto-login (bypass login screen)
 * 4. If expired/invalid → clear token, show login
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true while checking session

    // ── Check existing session on mount ────────────────────────────────────────
    useEffect(() => {
        const checkSession = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const { data } = await api.get('/api/auth/me');
                if (data.success && data.user) {
                    setUser(data.user);
                }
            } catch {
                // Token expired or invalid — clear it
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    // ── Login ──────────────────────────────────────────────────────────────────
    const login = useCallback(async ({ phone, email, password }) => {
        const { data } = await api.post('/api/auth/login', { phone, email, password });
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
        }
        return data;
    }, []);

    // ── Logout ─────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // Ignore network errors on logout
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Wipe local device database to prevent data leaking to next user
        try {
            const { clearAllStores } = await import('../utils/db');
            await clearAllStores();
        } catch (err) {
            console.error('[auth] Failed to clear offline DB on logout', err);
        }

        setUser(null);
    }, []);

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'Admin',
        isWorker: user?.role === 'Worker',
        isStudent: user?.role === 'Student',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;
