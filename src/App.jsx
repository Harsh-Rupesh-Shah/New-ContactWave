import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminRegister from './pages/AdminRegister';
import UserRegister from './pages/UserRegister';
import SecurityCode from './pages/SecurityCode';
import AdminLogin from './pages/AdminLogin';
import UserLogin from './pages/UserLogin';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LoaderProvider } from './context/LoaderContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoaderProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/register/admin" element={<AdminRegister />} />
            <Route path="/register" element={<UserRegister />} />
            <Route path="/verify-code" element={<SecurityCode />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Default Route - Redirect to User Registration */}
            <Route path="/" element={<Navigate to="/register" />} />
          </Routes>
        </LoaderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;