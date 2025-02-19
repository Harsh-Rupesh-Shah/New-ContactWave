import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function SecurityCode() {
  const navigate = useNavigate();
  const { setRegistrationData } = useAuth();
  const [code, setCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with code:', code); // Debugging log
    try {
      const tempLoginData = JSON.parse(localStorage.getItem('tempLoginData'));
      if (!tempLoginData) {
        console.error('No temporary login data found'); // Debugging log
        alert('No temporary login data found. Please try logging in or registering again.');
        return;
      }
  
      console.log('Temp login data:', tempLoginData); // Debugging log
      const response = await api.post('/api/verify-code', {
        code,
        email: tempLoginData.email,
        password: tempLoginData.password,
        isAdmin: tempLoginData.isAdmin,
        purpose: tempLoginData.purpose, // Include purpose in the request
      });
  
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        setRegistrationData({ email: tempLoginData.email, isAdmin: tempLoginData.isAdmin });
        navigate(tempLoginData.isAdmin ? '/dashboard/admin' : '/dashboard/user');
      }
    } catch (error) {
      console.error('Verification error:', error); // Debugging log
      alert(error.response?.data?.message || 'Verification failed');
    } finally {
      // Clear temporary login data
      localStorage.removeItem('tempLoginData');
    }
  };
  
  
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Shield className="h-12 w-12 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Security Code Verification</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Enter the Code received
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter security code"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Verify Code
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Didn't receive the code?{' '}
          <button
            onClick={() => {/* TODO: Implement resend code */}}
            className="font-medium text-purple-600 hover:text-purple-500"
          >
            Resend Code
          </button>
        </p>
      </div>
    </div>
  );
}

export default SecurityCode;
