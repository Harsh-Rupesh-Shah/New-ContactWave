import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function AdminLogin() {
  const navigate = useNavigate();
  const { setUser, setRegistrationData } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Store email and password temporarily with purpose
      localStorage.setItem('tempLoginData', JSON.stringify({ email: formData.email, password: formData.password, isAdmin: true, purpose: 'login' }));
  
      navigate('/verify-code', {
        state: {
          purpose: 'login',
          isAdmin: true,
          email: formData.email,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      alert(error.response?.data?.message || 'Login failed');
    }
  };
  


  const handleForgotPassword = async () => {
    try {
      const response = await api.post('/api/forgot-password', {
        email: formData.email,
        isAdmin: true,
      });

      if (response.data.success) {
        alert('Password reset code has been sent to your email');
        navigate('/reset-password');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      alert(error.response?.data?.message || 'Failed to send reset code');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <LogIn className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Admin Login</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleForgotPassword}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Forgot Password?
          </button>
          <a
            href="/register/admin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Register as Admin
          </a>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;