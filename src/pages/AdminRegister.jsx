import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function AdminRegister() {
  const navigate = useNavigate();
  const { setRegistrationData } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    surname: '',
    mobile: '',
    email: '',
    gender: '',
    spreadsheetUrl: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const extractSpreadsheetId = (url) => {
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return matches ? matches[1] : null;
  };

  // UserRegister.jsx and AdminRegister.jsx
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData); // Debugging log
    try {
      // Store email and password temporarily with purpose
      localStorage.setItem('tempLoginData', JSON.stringify({ email: formData.email, isAdmin: true, purpose: 'registration' }));
  
      const response = await api.post('/api/register/admin', formData);
      console.log('Registration response:', response); // Debugging log
  
      if (response.data.success) {
        setRegistrationData({ email: formData.email, isAdmin: true });
        navigate('/verify-code', {
          state: {
            purpose: 'registration',
            isAdmin: true,
            email: formData.email,
          },
        });
      }
    } catch (error) {
      console.error('Registration error:', error); // Debugging log
      alert(error.response?.data?.message || 'Registration failed');
    }
  };
  


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <UserPlus className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Admin Registration</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle Name</label>
              <input
                type="text"
                name="middleName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Surname</label>
            <input
              type="text"
              name="surname"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <input
              type="tel"
              name="mobile"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  required
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  onChange={handleChange}
                  checked={formData.gender === 'male'}
                  disabled={loading}
                />
                <span className="ml-2 text-gray-700">Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  required
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  onChange={handleChange}
                  checked={formData.gender === 'female'}
                  disabled={loading}
                />
                <span className="ml-2 text-gray-700">Female</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="other"
                  required
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  onChange={handleChange}
                  checked={formData.gender === 'other'}
                  disabled={loading}
                />
                <span className="ml-2 text-gray-700">Other</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Google Spreadsheet URL</label>
            <input
              type="url"
              name="spreadsheetUrl"
              required
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={handleChange}
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Please make sure the spreadsheet is accessible to the service account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login/admin" className="font-medium text-blue-600 hover:text-blue-500">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}

export default AdminRegister;