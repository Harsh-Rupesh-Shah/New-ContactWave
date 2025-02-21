import React, { useState, useEffect } from 'react';
import api from '../api/axios';

function SpreadsheetSetup() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [spreadsheetList, setSpreadsheetList] = useState([]);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Fetch the email from local storage or context
    const userEmail = localStorage.getItem('userEmail');
    setEmail(userEmail);

    // Fetch the list of spreadsheets for the user
    const fetchSpreadsheetList = async () => {
      try {
        const response = await api.get('/api/spreadsheet-list', {
          params: { email: userEmail },
        });
        setSpreadsheetList(response.data.spreadsheetList);
      } catch (error) {
        console.error('Error fetching spreadsheet list:', error);
      }
    };

    fetchSpreadsheetList();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/spreadsheet-setup', {
        email,
        spreadsheetUrl,
        spreadsheetName,
      });
      alert('Spreadsheet setup successful');
      // Refresh the spreadsheet list
      const response = await api.get('/api/spreadsheet-list', {
        params: { email },
      });
      setSpreadsheetList(response.data.spreadsheetList);
      setSpreadsheetUrl('');
      setSpreadsheetName('');
    } catch (error) {
      console.error('Spreadsheet setup error:', error);
      alert(error.response?.data?.message || 'Spreadsheet setup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Spreadsheet Setup</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Spreadsheet URL</label>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Spreadsheet Name</label>
            <input
              type="text"
              value={spreadsheetName}
              onChange={(e) => setSpreadsheetName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Add Spreadsheet
          </button>
        </form>
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Spreadsheets</h3>
          {spreadsheetList.length > 0 ? (
            <ul className="space-y-4">
              {spreadsheetList.map((spreadsheet) => (
                <li key={spreadsheet.id} className="border rounded-md p-4 shadow-sm">
                  {spreadsheet.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No spreadsheets found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpreadsheetSetup;
