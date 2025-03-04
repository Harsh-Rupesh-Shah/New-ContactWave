import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Group,
  Combine,
  FileSpreadsheet,
  Trash2,
  FileDown,
  Search,
  Plus,
  X
} from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function MessageCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [spreadsheetData, setSpreadsheetData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState([]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showCombineGroupsModal, setShowCombineGroupsModal] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [newCombinedGroupName, setNewCombinedGroupName] = useState('');
  const [newCombinedGroupDescription, setNewCombinedGroupDescription] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({});

  useEffect(() => {
    fetchSpreadsheetData();
    fetchGroups();
  }, []);

  const fetchSpreadsheetData = async () => {
    try {
      const response = await api.get('/api/fetch-registrations');
      if (response.data && response.data.length > 0) {
        setHeaders(response.data[0]);
        setSpreadsheetData(response.data.slice(1));
      }
    } catch (error) {
      console.error('Error fetching spreadsheet data:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/api/fetch-groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleRowSelect = (row) => {
    setSelectedRows(prev => {
      const isSelected = prev.some(r => r[0] === row[0]);
      if (isSelected) {
        return prev.filter(r => r[0] !== row[0]);
      } else {
        return [...prev, row];
      }
    });
  };

  const handleCreateGroup = async () => {
    try {
      const response = await api.post('/api/create-group', {
        groupName,
        description: groupDescription,
        selectedFields: selectedRows.map(row => ({
          uniqueId: row[0],
          // Add other necessary fields
        }))
      });

      if (response.data.success) {
        setShowCreateGroupModal(false);
        setGroupName('');
        setGroupDescription('');
        setSelectedRows([]);
        fetchGroups();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleCombineGroups = async () => {
    try {
      const response = await api.post('/api/combine-groups', {
        groupIds: selectedGroups,
        newGroupName: newCombinedGroupName,
        description: newCombinedGroupDescription
      });

      if (response.data.success) {
        setShowCombineGroupsModal(false);
        setSelectedGroups([]);
        setNewCombinedGroupName('');
        setNewCombinedGroupDescription('');
        fetchGroups();
      }
    } catch (error) {
      console.error('Error combining groups:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      // Create a new row with the user data
      const newRow = headers.map(header => newUserData[header] || '');
      
      // Add the user to the spreadsheet
      await api.post('/api/add-user', { userData: newUserData });
      
      setShowAddUserModal(false);
      setNewUserData({});
      fetchSpreadsheetData();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/api/export-pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet-data.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/api/export-csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'spreadsheet-data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleDeleteUsers = async () => {
    if (!selectedRows.length) return;

    if (window.confirm('Are you sure you want to delete the selected users?')) {
      try {
        const response = await api.delete('/api/delete-users', {
          data: {
            userIds: selectedRows.map(row => row[0])
          }
        });

        if (response.data.success) {
          setSelectedRows([]);
          fetchSpreadsheetData();
        }
      } catch (error) {
        console.error('Error deleting users:', error);
      }
    }
  };

  const filteredData = spreadsheetData.filter(row =>
    row.some(cell => 
      cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Group className="w-5 h-5 mr-2" />
            Create Group
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add User
          </button>

          <button
            onClick={() => setShowGroupsModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Users className="w-5 h-5 mr-2" />
            Show Groups
          </button>

          <button
            onClick={() => setShowCombineGroupsModal(true)}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            <Combine className="w-5 h-5 mr-2" />
            Combine Groups
          </button>

          <button
            onClick={() => navigate('/spreadsheet-setup')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Change Spreadsheet
          </button>

          <button
            onClick={handleDeleteUsers}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Selected
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FileDown className="w-5 h-5 mr-2" />
            Export PDF
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FileDown className="w-5 h-5 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={selectedRows.some(r => r[0] === row[0]) ? 'bg-indigo-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.some(r => r[0] === row[0])}
                      onChange={() => handleRowSelect(row)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Group Modal */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New Group</h3>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add New User</h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {headers.map((header, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700">
                      {header}
                    </label>
                    <input
                      type="text"
                      value={newUserData[header] || ''}
                      onChange={(e) => setNewUserData({...newUserData, [header]: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={header.toLowerCase().includes('unique')} // Disable Unique ID field
                    />
                  </div>
                ))}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show Groups Modal */}
        {showGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Groups</h3>
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {groups.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No groups found</p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.groupId}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <h4 className="font-medium">{group.groupName}</h4>
                      <p className="text-sm text-gray-500">ID: {group.groupId}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowGroupsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Combine Groups Modal */}
        {showCombineGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Combine Groups</h3>
                <button
                  onClick={() => setShowCombineGroupsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Groups to Combine
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {groups.map((group) => (
                      <div key={group.groupId} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`group-${group.groupId}`}
                          checked={selectedGroups.includes(group.groupId)}
                          onChange={() => {
                            if (selectedGroups.includes(group.groupId)) {
                              setSelectedGroups(selectedGroups.filter(id => id !== group.groupId));
                            } else {
                              setSelectedGroups([...selectedGroups, group.groupId]);
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`group-${group.groupId}`} className="ml-2 text-sm text-gray-700">
                          {group.groupName}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Group Name
                  </label>
                  <input
                    type="text"
                    value={newCombinedGroupName}
                    onChange={(e) => setNewCombinedGroupName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newCombinedGroupDescription}
                    onChange={(e) => setNewCombinedGroupDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCombineGroupsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCombineGroups}
                    disabled={selectedGroups.length < 2 || !newCombinedGroupName}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Combine Groups
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageCenter;