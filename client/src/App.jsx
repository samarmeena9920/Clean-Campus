// App.jsx — UPDATED
// Change: added /admin/buildings route → BuildingManagement component
// Everything else identical to the continue-update.zip version

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import UpdateBanner from './components/UpdateBanner';
import OfflineIndicator from './components/OfflineIndicator';
import ProtectedRoute from './components/ProtectedRoute';

import WorkerLayout  from './layouts/WorkerLayout';
import AdminLayout   from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

import AttendancePage   from './pages/worker/AttendancePage';
import TasksPage        from './pages/worker/TasksPage';
import InventoryPage    from './pages/worker/InventoryPage';

import OverviewPage         from './pages/admin/OverviewPage';
import RosterPage           from './pages/admin/RosterPage';
import TaskAuditPage        from './pages/admin/TaskAuditPage';
import InventoryAdminPage   from './pages/admin/InventoryAdminPage';
import UsersPage            from './pages/admin/UsersPage';
import FlaggedPage          from './pages/admin/FlaggedPage';
import ComplaintsAdminPage  from './pages/admin/ComplaintsAdminPage';
import BuildingManagement   from './pages/admin/BuildingManagement'; // ← NEW

import StudentComplaintsPage from './pages/student/StudentComplaintsPage';
import SubmitComplaintPage   from './pages/student/SubmitComplaintPage';

import RegisterStudentPage from './pages/RegisterStudentPage';
import PublicDashboard     from './pages/PublicDashboard';

function RootRedirect() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'Admin')   return <Navigate to="/admin" replace />;
    if (user.role === 'Student') return <Navigate to="/student/complaints" replace />;
    return <Navigate to="/worker/attendance" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <UpdateBanner />

                <Routes>
                    {/* Public */}
                    <Route path="/login"    element={<LoginPage />} />
                    <Route path="/register" element={<RegisterStudentPage />} />
                    <Route path="/board"    element={<PublicDashboard />} />

                    <Route path="/" element={<RootRedirect />} />

                    {/* Worker */}
                    <Route path="/worker" element={<ProtectedRoute roles={['Worker']}><WorkerLayout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="attendance" replace />} />
                        <Route path="attendance" element={<AttendancePage />} />
                        <Route path="tasks"      element={<TasksPage />} />
                        <Route path="inventory"  element={<InventoryPage />} />
                    </Route>

                    {/* Admin */}
                    <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminLayout /></ProtectedRoute>}>
                        <Route index              element={<OverviewPage />} />
                        <Route path="complaints"  element={<ComplaintsAdminPage />} />
                        <Route path="buildings"   element={<BuildingManagement />} /> {/* ← NEW */}
                        <Route path="roster"      element={<RosterPage />} />
                        <Route path="tasks"       element={<TaskAuditPage />} />
                        <Route path="inventory"   element={<InventoryAdminPage />} />
                        <Route path="users"       element={<UsersPage />} />
                        <Route path="flagged"     element={<FlaggedPage />} />
                    </Route>

                    {/* Student */}
                    <Route path="/student" element={<ProtectedRoute roles={['Student']}><StudentLayout /></ProtectedRoute>}>
                        <Route index                  element={<Navigate to="complaints" replace />} />
                        <Route path="complaints"      element={<StudentComplaintsPage />} />
                        <Route path="complaints/new"  element={<SubmitComplaintPage />} />
                        <Route path="board"           element={<PublicDashboard />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <OfflineIndicator />
            </AuthProvider>
        </BrowserRouter>
    );
}

import LoginPage from './pages/LoginPage';
export default App;
