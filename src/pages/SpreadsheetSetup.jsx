import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, FileSpreadsheet, Plus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function SpreadsheetSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [newSpreadsheet, setNewSpreadsheet] = useState({
    url: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);

  useEffect(() => {
    fetchSpreadsheets();
  }, []);

  const fetchSpreadsheets = async () => {
    try {
      const response = await api.get('/api/spreadsheet-list', {
        params: { email: user?.email },
        withCredentials: true
      });
      setSpreadsheets(response.data.spreadsheetList);
    } catch (error) {
      console.error('Failed to fetch spreadsheets:', error);
      setError('Failed to load spreadsheets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/api/spreadsheet-setup', {
        email: user?.email,
        spreadsheetUrl: newSpreadsheet.url,
        spreadsheetName: newSpreadsheet.name,
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setNewSpreadsheet({ url: '', name: '' });
        setSuccessMessage(response.data.message);
        fetchSpreadsheets();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadsheetSelect = async (spreadsheet) => {
    try {
      setSelectedSpreadsheet(spreadsheet);
      setSuccessMessage(`Spreadsheet "${spreadsheet.name}" has been selected successfully.`);
      
      // Show success message for 1.5 seconds before redirecting
      setTimeout(() => {
        navigate('/message-center');
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to select spreadsheet');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white">
      <Navbar />

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <p>{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Add New Spreadsheet Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Spreadsheet</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spreadsheet URL
              </label>
              <input
                type="url"
                value={newSpreadsheet.url}
                onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, url: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spreadsheet Name
              </label>
              <input
                type="text"
                value={newSpreadsheet.name}
                onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, name: e.target.value })}
                placeholder="Enter a name for this spreadsheet"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Spreadsheet
            </button>
          </form>
        </div>

        {/* Existing Spreadsheets */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Spreadsheets</h3>
          {spreadsheets.length === 0 ? (
            <div className="text-center py-8">
              <Table className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No spreadsheets found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {spreadsheets.map((sheet) => (
                <div
                  key={sheet.id}
                  onClick={() => handleSpreadsheetSelect(sheet)}
                  className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                    selectedSpreadsheet?.id === sheet.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{sheet.name}</h4>
                      <p className="text-sm text-gray-500">ID: {sheet.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpreadsheetSetup;