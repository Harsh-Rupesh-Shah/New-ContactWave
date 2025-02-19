import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function UserDashboard() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <User className="h-8 w-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-4 mb-6">
              <User className="h-12 w-12 text-emerald-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
                <p className="text-gray-600">Your personal details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{user?.email}</p>
              </div>
              {/* Add more profile fields as needed */}
            </div>
          </div>

          {/* Documents Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-4 mb-6">
              <FileText className="h-12 w-12 text-emerald-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Your Documents</h2>
                <p className="text-gray-600">Access and manage your files</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">No documents available yet.</p>
              {/* Add document list or upload functionality as needed */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserDashboard;