import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import api from '../api/axios';

function ResetPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    isAdmin: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await api.post('/api/reset-password', {
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword,
        isAdmin: formData.isAdmin,
      });

      if (response.data.success) {
        alert('Password reset successful');
        navigate(formData.isAdmin ? '/login/admin' : '/login');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Password reset failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <KeyRound className="h-12 w-12 text-rose-600" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Reset Password</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reset Code</label>
            <input
              type="text"
              name="code"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              name="newPassword"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isAdmin"
              className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
              onChange={handleChange}
            />
            <label className="ml-2 block text-sm text-gray-700">
              I am an admin
            </label>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Reset Password
          </button>
        </form>

        <div className="mt-4 text-center">
          <a
            href="/login"
            className="text-sm font-medium text-rose-600 hover:text-rose-500"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;