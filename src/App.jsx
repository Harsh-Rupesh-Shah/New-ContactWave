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
import SpreadsheetSetup from './pages/SpreadsheetSetup';
import MessageCenter from './pages/MessageCenter';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { LoaderProvider } from './context/LoaderContext';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';

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
            <Route path="/home" element={<Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />

            
            {/* Protected Routes */}
            <Route
              path="/spreadsheet-setup"
              element={
                <ProtectedRoute>
                  <SpreadsheetSetup />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/message-center"
              element={
                <ProtectedRoute>
                  <MessageCenter />
                </ProtectedRoute>
              }
            />
            
            {/* Default Route - Redirect to User Login */}
            <Route path="/" element={<Navigate to="/home" />} />
          </Routes>
        </LoaderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;