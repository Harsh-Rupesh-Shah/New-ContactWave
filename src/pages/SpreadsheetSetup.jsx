import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, FileSpreadsheet, Plus, Search, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

function SpreadsheetSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [filteredSpreadsheets, setFilteredSpreadsheets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSpreadsheet, setNewSpreadsheet] = useState({
    url: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [spreadsheetToDelete, setSpreadsheetToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSpreadsheets();
  }, [user]); // Add user to dependency array

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSpreadsheets(spreadsheets);
    } else {
      const filtered = spreadsheets.filter(sheet =>
        sheet.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
      setFilteredSpreadsheets(filtered);
    }
  }, [searchTerm, spreadsheets]);

  const fetchSpreadsheets = async () => {
    try {
      // Get spreadsheetId from cookies if not available in user context
      const spreadsheetId = user?.spreadsheetId || Cookies.get('spreadsheetId');

      if (!spreadsheetId) {
        toast.error('No spreadsheet ID found. Please login again.');
        navigate('/login');
        return;
      }

      const response = await api.get('/api/spreadsheet-list', {
        params: { email: user?.email },
        withCredentials: true
      });

      setSpreadsheets(response.data.spreadsheetList || []);
      setFilteredSpreadsheets(response.data.spreadsheetList || []);
    } catch (error) {
      console.error('Failed to fetch spreadsheets:', error);
      toast.error('Failed to load spreadsheets');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validate URL format
      const urlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
      if (!urlPattern.test(newSpreadsheet.url)) {
        toast.error('Please enter a valid Google Sheets URL in the format: https://docs.google.com/spreadsheets/d/...');
        return;
      }

      const matches = newSpreadsheet.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = matches ? matches[1] : null;

      if (!spreadsheetId) {
        toast.error('Invalid spreadsheet URL');
        return;
      }

      // Check if spreadsheet already exists in local state before making API call
      const isDuplicate = spreadsheets.some(sheet =>
        sheet.url === newSpreadsheet.url || sheet.id === spreadsheetId
      );

      if (isDuplicate) {
        toast.error('This spreadsheet is already in your list');
        return;
      }

      const initResponse = await api.post('/api/init-spreadsheet', {
        spreadsheetId,
        headers: ['Unique ID', 'First Name', 'Middle Name', 'Last Name', 'Email', 'Phone', 'Gender']
      });

      if (!initResponse.data.success) {
        throw new Error(initResponse.data.message);
      }

      const response = await api.post('/api/spreadsheet-setup', {
        email: user?.email,
        spreadsheetUrl: newSpreadsheet.url,
        spreadsheetName: newSpreadsheet.name,
        spreadsheetId
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setNewSpreadsheet({ url: '', name: '' });
        toast.success('Spreadsheet added successfully');
        fetchSpreadsheets();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to add spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadsheetSelect = async (spreadsheet) => {
    try {
      setSelectedSpreadsheet(spreadsheet);
      localStorage.setItem('selectedSpreadsheetId', spreadsheet.id);
      toast.success(`Spreadsheet "${spreadsheet.name}" selected successfully`);

      setTimeout(() => {
        navigate('/message-center');
      }, 1500);
    } catch (error) {
      toast.error('Failed to select spreadsheet');
    }
  };

  const handleDeleteClick = (e, spreadsheet) => {
    e.stopPropagation();
    setSpreadsheetToDelete(spreadsheet);
    setShowDeleteModal(true);
  };

  const confirmDeleteSpreadsheet = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/api/delete-spreadsheet', {
        data: {
          email: user?.email,
          spreadsheetId: spreadsheetToDelete.id
        },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Spreadsheet deleted successfully');
        fetchSpreadsheets(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to delete spreadsheet:', error);
      toast.error(error.response?.data?.error || 'Failed to delete spreadsheet');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setSpreadsheetToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      <Navbar />

      {/* Delete Confirmation Modal - Built directly into the component */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Confirm Deletion
                  </h3>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-gray-700">
                    Are you sure you want to delete the spreadsheet "{spreadsheetToDelete?.name}"?
                  </p>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={confirmDeleteSpreadsheet}
                      disabled={isDeleting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Add New Spreadsheet Form */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8 border border-gray-100">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">Add New Spreadsheet</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spreadsheet URL
                </label>
                <input
                  type="url"
                  value={newSpreadsheet.url}
                  onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 border"
                  pattern="https://docs\.google\.com/spreadsheets/d/.*"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spreadsheet Name
                </label>
                <input
                  type="text"
                  value={newSpreadsheet.name}
                  onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, name: e.target.value })}
                  placeholder="Enter a name for this spreadsheet"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 border"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto flex justify-center items-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              {loading ? 'Adding...' : 'Add Spreadsheet'}
            </button>
          </form>
        </div>

        {/* Existing Spreadsheets */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">Your Spreadsheets</h3>
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by spreadsheet name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {filteredSpreadsheets.length === 0 ? (
            <div className="text-center py-12">
              <Table className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">
                {searchTerm ? 'No spreadsheets match your search' : 'No spreadsheets found'}
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSpreadsheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    onClick={() => handleSpreadsheetSelect(sheet)}
                    className={`relative border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer ${selectedSpreadsheet?.id === sheet.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{sheet.name}</h4>
                        <p className="text-sm text-gray-500 truncate">ID: {sheet.id}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(e, sheet)}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Delete spreadsheet"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpreadsheetSetup;