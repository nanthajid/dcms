import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Counselors from './pages/Counselors';
import CounselorDetail from './pages/CounselorDetail';
import HowToUse from './pages/HowToUse';
import AdminLogin from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CounselorManagement from './pages/admin/CounselorManagement';
import StaffManagement from './pages/admin/StaffManagement';
import LeaveManagement from './pages/admin/LeaveManagement';
import WFHManagement from './pages/admin/WFHManagement';
import OutsideWorkManagement from './pages/admin/OutsideWorkManagement';
import OutsideWorkLeave from './pages/admin/OutsideWorkLeave';
import OutsideWorkSpecialManagement from './pages/admin/OutsideWorkSpecialManagement';
import OutsideWorkSpecialLeave from './pages/admin/OutsideWorkSpecialLeave';
import MonthlyReport from './pages/admin/MonthlyReport';
import ExecutiveReport from './pages/admin/ExecutiveReport';
import EditableReport from './pages/admin/EditableReport';
import AppointmentManagement from './pages/admin/AppointmentManagement';
import Settings from './pages/admin/Settings';
import WorkRateSettings from './pages/admin/WorkRateSettings';
import './App.css';

// Simple Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <Router basename="/dcms">
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Home />
            </main>
          </div>
        } />

        {/* Counselors Listing Page */}
        <Route path="/counselors" element={<Counselors />} />

        {/* How to use Page */}
        <Route path="/how-to-use" element={<HowToUse />} />

        {/* Counselor Detail Page */}
        <Route path="/counselor/:id" element={<CounselorDetail />} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="counselors" element={<CounselorManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="leave" element={<LeaveManagement />} />
          <Route path="wfh" element={<WFHManagement />} />
          <Route path="outside-work" element={<OutsideWorkManagement />} />
          <Route path="outside-work-leave" element={<OutsideWorkLeave />} />
          <Route path="outside-work-special" element={<OutsideWorkSpecialManagement />} />
          <Route path="outside-work-special-leave" element={<OutsideWorkSpecialLeave />} />
          <Route path="reports">
            <Route path="monthly" element={<MonthlyReport />} />
            <Route path="executive" element={<ExecutiveReport />} />
            <Route path="editable" element={<EditableReport />} />
          </Route>
          <Route path="appointments" element={<AppointmentManagement />} />
          <Route path="work-rates" element={<WorkRateSettings />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
