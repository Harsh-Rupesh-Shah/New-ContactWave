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
  X,
  Check,
  Info,
  UserMinus,
  FileUp
} from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [showDeleteGroupsModal, setShowDeleteGroupsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [showAddToGroupsModal, setShowAddToGroupsModal] = useState(false);
  const [showRemoveFromGroupsModal, setShowRemoveFromGroupsModal] = useState(false);
  const [groupsToRemoveFrom, setGroupsToRemoveFrom] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [file, setFile] = useState(null);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [isMappingComplete, setIsMappingComplete] = useState(false);

  useEffect(() => {
    const storedSpreadsheetId = localStorage.getItem('selectedSpreadsheetId');
    if (storedSpreadsheetId) {
      fetchSpreadsheetData(storedSpreadsheetId);
      fetchGroups(storedSpreadsheetId);
    } else {
      navigate('/spreadsheet-setup');
    }
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const fetchSpreadsheetData = async (spreadsheetId) => {
    try {
      setLoading(true);
      const response = await api.get('/api/fetch-registrations', {
        params: { spreadsheetId }
      });

      if (response.data && response.data.length > 0) {
        setHeaders(response.data[0]);
        setSpreadsheetData(response.data.slice(1));
      }
    } catch (error) {
      console.error('Error fetching spreadsheet data:', error);
      toast.error('Failed to load spreadsheet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (spreadsheetId) => {
    try {
      const response = await api.get('/api/fetch-groups', {
        params: { spreadsheetId }
      });
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to fetch groups');
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRows(filteredData);
    } else {
      setSelectedRows([]);
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
      if (!groupName.trim()) {
        toast.error('Please enter a group name');
        return;
      }

      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      if (!spreadsheetId) {
        toast.error('No spreadsheet selected');
        return;
      }

      if (selectedRows.length === 0) {
        toast.error('Please select users to add to the group');
        return;
      }

      const response = await api.post('/api/create-group', {
        groupName,
        description: groupDescription,
        selectedFields: selectedRows,
        spreadsheetId
      });

      if (response.data.success) {
        toast.success(`Group "${groupName}" created with ${response.data.groupDetails.memberCount} members`);
        setShowCreateGroupModal(false);
        setGroupName('');
        setGroupDescription('');
        setSelectedRows([]);
        fetchGroups(spreadsheetId);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };



  const handleCombineGroups = async () => {
    try {
      if (!newCombinedGroupName.trim()) {
        toast.error('Please enter a name for the combined group');
        return;
      }

      if (selectedGroups.length < 2) {
        toast.error('Please select at least two groups to combine');
        return;
      }

      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      const response = await api.post('/api/combine-groups', {
        groupIds: selectedGroups,
        newGroupName: newCombinedGroupName,
        description: newCombinedGroupDescription,
        spreadsheetId
      });

      if (response.data.success) {
        toast.success(`Combined group "${newCombinedGroupName}" created with ${response.data.groupDetails.memberCount} members`);
        setShowCombineGroupsModal(false);
        setSelectedGroups([]);
        setNewCombinedGroupName('');
        setNewCombinedGroupDescription('');
        fetchGroups(spreadsheetId);
      }
    } catch (error) {
      console.error('Error combining groups:', error);
      toast.error('Failed to combine groups');
    }
  };

  const handleDeleteGroups = async () => {
    try {
      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      const response = await api.delete('/api/delete-groups', {
        data: {
          groupIds: selectedGroups,
          spreadsheetId
        }
      });

      if (response.data.success) {
        toast.success(`Successfully deleted ${response.data.deletedCount} group(s)`);
        setSelectedGroups([]);
        fetchGroups(spreadsheetId); // Refresh the groups list
      }
    } catch (error) {
      console.error('Error deleting groups:', error);
      toast.error(error.response?.data?.message || 'Failed to delete groups');
    }
  };

  const handleAddUser = async () => {
    try {
      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      const response = await api.post('/api/add-user', {
        userData: newUserData,
        spreadsheetId
      });

      if (response.data.success) {
        toast.success('User added successfully');
        setShowAddUserModal(false);
        setNewUserData({});
        fetchSpreadsheetData(spreadsheetId);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleExport = async (format) => {
    try {
      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      const response = await api.get(`/api/export-${format}`, {
        params: { spreadsheetId },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' :
          format === 'csv' ? 'text/csv' :
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Data exported as ${format.toUpperCase()}`);
      setShowExportDropdown(false);
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const handleDeleteUsers = async () => {
    if (!selectedRows.length) {
      toast.error('Please select users to delete');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedRows.length} selected user(s)?`);
    if (confirmDelete) {
      try {
        const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
        if (!spreadsheetId) {
          toast.error('No spreadsheet selected');
          return;
        }

        const response = await api.delete('/api/delete-users', {
          data: {
            userIds: selectedRows.map(row => row[0]),
            spreadsheetId
          }
        });

        if (response.data.success) {
          toast.success(`Successfully deleted ${response.data.deletedCount} user(s)`);
          setSelectedRows([]);
          fetchSpreadsheetData(spreadsheetId); // Refresh the data
          fetchGroups(spreadsheetId); // Refresh groups as they might be affected
        }
      } catch (error) {
        console.error('Error deleting users:', error);
        toast.error(error.response?.data?.message || 'Failed to delete users');
      }
    }
  };
  ;

  // Original function for Show Groups modal
  const handleGroupCheckboxChange = (groupId) => {
    setSelectedGroups(prevSelectedGroups => {
      if (prevSelectedGroups.includes(groupId)) {
        return prevSelectedGroups.filter(id => id !== groupId);
      } else {
        return [...prevSelectedGroups, groupId];
      }
    });
  };

  // New function for Remove from Groups modal
  const handleRemoveGroupCheckboxChange = (groupId) => {
    setGroupsToRemoveFrom(prevGroups => {
      if (prevGroups.includes(groupId)) {
        return prevGroups.filter(id => id !== groupId);
      } else {
        return [...prevGroups, groupId];
      }
    });
  };

  const resetImportState = () => {
    setImportData([]);
    setFile(null);
    setImportHeaders([]);
    setImportMapping({});
    setIsMappingComplete(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFile(file);

    try {
      let data = [];
      let headers = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length === 0) {
          throw new Error('CSV file is empty');
        }
        headers = rows[0].split(',').map(h => h.trim());
        data = rows.slice(1).map(row => {
          const values = row.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i]?.trim() || '';
            return obj;
          }, {});
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          throw new Error('Excel sheet is empty');
        }

        headers = jsonData[0];
        data = jsonData.slice(1).map(row => {
          return headers.reduce((obj, header, i) => {
            obj[header] = (row[i] !== undefined && row[i] !== null) ? String(row[i]).trim() : '';
            return obj;
          }, {});
        });
      } else {
        throw new Error('Unsupported file format');
      }

      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      setImportData(data);
      setImportHeaders(headers);
      setImportMapping({});
      setIsMappingComplete(false);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error(`Error: ${error.message}`);
      resetImportState();
    }
  };

  const handleMappingChange = (spreadsheetHeader, importHeader) => {
    const newMapping = { ...importMapping, [spreadsheetHeader]: importHeader };
    setImportMapping(newMapping);

    // Check if all required headers are mapped (excluding Unique ID)
    const requiredHeaders = headers.filter(h => h !== 'Unique ID');
    const mappedHeaders = Object.keys(newMapping).filter(k => newMapping[k]);

    // Check if all required headers are mapped and have non-empty values
    const isComplete = requiredHeaders.every(h =>
      mappedHeaders.includes(h) && newMapping[h]
    );

    setIsMappingComplete(isComplete);
  };

  const handleImportSubmit = async () => {
    try {
      const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
      if (!spreadsheetId) {
        toast.error('No spreadsheet selected');
        return;
      }

      // Transform data according to mapping
      const transformedData = importData.map(row => {
        const newRow = {};
        Object.entries(importMapping).forEach(([spreadsheetHeader, importHeader]) => {
          newRow[spreadsheetHeader] = row[importHeader];
        });
        return newRow;
      });

      // Get next available ID
      const response = await api.get('/api/get-next-id', {
        params: { spreadsheetId }
      });
      const nextId = response.data.nextId;

      // Prepare data for API with auto-incremented IDs
      const dataWithIds = transformedData.map((row, index) => {
        return {
          ...row,
          'Unique ID': (nextId + index).toString() // Auto-generate sequential IDs
        };
      });

      // Send to backend
      const importResponse = await api.post('/api/import-data', {
        spreadsheetId,
        data: dataWithIds
      });

      if (importResponse.data.success) {
        toast.success(`Successfully imported ${dataWithIds.length} records`);
        setShowImportModal(false);
        resetImportState();
        fetchSpreadsheetData(spreadsheetId); // Refresh the data
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data');
    }
  };

  const filteredData = () => {
    if (selectedGroups.length > 0) {
      const selectedMemberIds = selectedGroups.flatMap(groupId => {
        const group = groups.find(group => group.groupId === groupId);
        return group ? group.memberIds : [];
      });

      const uniqueMemberIds = Array.from(new Set(selectedMemberIds));

      return spreadsheetData.filter(row => uniqueMemberIds.includes(row[0]));
    }

    return spreadsheetData.filter(row =>
      row.some(cell =>
        cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">

          <button
            onClick={() => {
              if (selectedRows.length === 0) {
                toast.error('Please select at least one user to send message');
                return;
              }
              // Store selected users in localStorage temporarily
              localStorage.setItem('selectedUsersForMessage', JSON.stringify(selectedRows));
              navigate('/send-message');
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Combine className="w-5 h-5 mr-2" />
            Send Message
          </button>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Group className="w-5 h-5 mr-2" />
            Create Group
          </button>

          <button
            onClick={() => setShowAddToGroupsModal(true)}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Add to Existing Groups
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
            onClick={() => setShowRemoveFromGroupsModal(true)}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserMinus className="w-5 h-5 mr-2" />
            Remove from Groups
          </button>

          <button
            onClick={() => {
              if (selectedGroups.length === 0) {
                setShowGroupsModal(true);
                toast.error('Please select groups to delete');
              } else {
                setShowDeleteGroupsModal(true);
              }
            }}
            disabled={selectedGroups.length === 0}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Groups
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
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FileUp className="w-5 h-5 mr-2" />
            Import Data
          </button>

          <button
            onClick={handleDeleteUsers}
            disabled={!selectedRows.length}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Selected
          </button>

          {/* Export Dropdown */}
          <div className="relative export-dropdown">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <FileDown className="w-5 h-5 mr-2" />
              Export
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Export as Excel
                  </button>
                </div>
              </div>
            )}
          </div>
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
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData().map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={rowIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
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
                        className="px-4 py-3 whitespace-nowrap text-sm text-gray-700"
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => {
                          setEditingRow([...row]);
                          setEditingRowIndex(rowIndex);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <div className="mt-2">
                  <p className="text-sm text-gray-600 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    Selected members: {selectedRows.length}
                  </p>
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

        {/* Edit Row Modal */}
        {showEditModal && editingRow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Entry</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {headers.map((header, index) => (
                  <div key={index}>
                    {header === 'Unique ID' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {header}
                        </label>
                        <input
                          type="text"
                          value={editingRow[index]}
                          readOnly
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {header}
                        </label>
                        <input
                          type="text"
                          value={editingRow[index] || ''}
                          onChange={(e) => {
                            const newRow = [...editingRow];
                            newRow[index] = e.target.value;
                            setEditingRow(newRow);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
                        const response = await api.put('/api/update-row', {
                          spreadsheetId,
                          rowData: editingRow,
                          rowIndex: editingRowIndex
                        });

                        if (response.data.success) {
                          toast.success('Entry updated successfully');
                          fetchSpreadsheetData(spreadsheetId);
                          setShowEditModal(false);
                        }
                      } catch (error) {
                        console.error('Error updating row:', error);
                        toast.error('Failed to update entry');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Update
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
                      onChange={(e) => setNewUserData({ ...newUserData, [header]: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={header.toLowerCase().includes('unique')}
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

        {showAddToGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Users to Groups</h3>
                <button
                  onClick={() => {
                    setShowAddToGroupsModal(false);
                    setSelectedGroups([]);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Groups to Add Users To
                  </label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    {groups.map((group) => (
                      <div key={group.groupId} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`add-group-${group.groupId}`}
                          checked={selectedGroups.includes(group.groupId)}
                          onChange={() => handleGroupCheckboxChange(group.groupId)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`add-group-${group.groupId}`} className="ml-2 text-sm text-gray-700">
                          {group.groupName}
                          <span className="ml-2 text-xs text-gray-500">
                            ({group.memberCount} members)
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected users: {selectedRows.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    Selected groups: {selectedGroups.length}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddToGroupsModal(false);
                      setSelectedGroups([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
                        const userIds = selectedRows.map(row => row[0]);

                        const response = await api.post('/api/add-users-to-groups', {
                          userIds,
                          groupIds: selectedGroups,
                          spreadsheetId
                        });

                        if (response.data.success) {
                          toast.success(`Added ${selectedRows.length} user(s) to ${selectedGroups.length} group(s)`);
                          setShowAddToGroupsModal(false);
                          setSelectedGroups([]);
                          fetchGroups(spreadsheetId); // Refresh groups
                        }
                      } catch (error) {
                        console.error('Error adding users to groups:', error);
                        toast.error('Failed to add users to groups');
                      }
                    }}
                    disabled={selectedGroups.length === 0}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Users
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Groups Confirmation Modal */}
        {showDeleteGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Delete Groups</h3>
                <button
                  onClick={() => setShowDeleteGroupsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to delete {selectedGroups.length} selected group(s)?
                </p>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                  {groups
                    .filter(group => selectedGroups.includes(group.groupId))
                    .map(group => (
                      <div key={group.groupId} className="flex items-center mb-2">
                        <div className="ml-2 text-sm">
                          <span className="font-medium">{group.groupName}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({group.memberCount} members)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteGroupsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handleDeleteGroups();
                      setShowDeleteGroupsModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete Groups
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRemoveFromGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Remove Users from Groups</h3>
                <button
                  onClick={() => {
                    setShowRemoveFromGroupsModal(false);
                    setGroupsToRemoveFrom([]);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Groups to Remove Users From
                  </label>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    {groups.map((group) => (
                      <div key={group.groupId} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`remove-group-${group.groupId}`}
                          checked={groupsToRemoveFrom.includes(group.groupId)}
                          onChange={() => handleRemoveGroupCheckboxChange(group.groupId)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`remove-group-${group.groupId}`} className="ml-2 text-sm text-gray-700">
                          {group.groupName}
                          <span className="ml-2 text-xs text-gray-500">
                            ({group.memberCount} members)
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected users: {selectedRows.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    Selected groups: {groupsToRemoveFrom.length}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowRemoveFromGroupsModal(false);
                      setGroupsToRemoveFrom([]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
                        const userIds = selectedRows.map(row => row[0]);

                        const response = await api.post('/api/remove-users-from-groups', {
                          userIds,
                          groupIds: groupsToRemoveFrom,
                          spreadsheetId
                        });

                        if (response.data.success) {
                          toast.success(`Removed ${selectedRows.length} user(s) from ${groupsToRemoveFrom.length} group(s)`);
                          setShowRemoveFromGroupsModal(false);
                          setGroupsToRemoveFrom([]);
                          fetchGroups(spreadsheetId); // Refresh groups
                        }
                      } catch (error) {
                        console.error('Error removing users from groups:', error);
                        toast.error('Failed to remove users from groups');
                      }
                    }}
                    disabled={groupsToRemoveFrom.length === 0}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove Users
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show Groups Modal */}
        {showGroupsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Groups</h3>
                <button
                  onClick={() => {
                    setShowGroupsModal(false);
                    setSelectedGroupMembers([]);
                    setSelectedRows([]);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {groups.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No groups found</p>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.groupId}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors flex items-start"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.groupId)}
                          onChange={() => handleGroupCheckboxChange(group.groupId)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{group.groupName}</h4>
                          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 ml-auto">
                          {group.memberCount} members
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-l pl-6">
                  <h4 className="font-medium text-gray-900 mb-4">Selected Group Members</h4>
                  {selectedGroups.length > 0 ? (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedGroups.flatMap(groupId => {
                            const group = groups.find(group => group.groupId === groupId);
                            return group ? group.members.map(member => (
                              <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{member.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{member.email}</td>
                              </tr>
                            )) : [];
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Select groups to view members</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowGroupsModal(false);
                    setSelectedGroupMembers([]);
                    setSelectedRows([]);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Import Data</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    resetImportState();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pb-4">
                {/* Step 1: File Upload */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 text-gray-800">Step 1: Upload File</h4>
                  <div className="flex items-center gap-4">
                    <label className="block flex-1">
                      <span className="sr-only">Choose CSV or Excel file</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
                      />
                    </label>
                    {file && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-1" />
                        {file.name}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Supported formats: .csv, .xlsx, .xls
                  </p>
                </div>

                {/* Step 2: Column Mapping */}
                {importData.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 text-gray-800">Step 2: Map Columns</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Spreadsheet Column
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Map To
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {headers.map((header, index) => (
                            <tr key={index} className={header === 'Unique ID' ? 'bg-gray-50' : ''}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {header}
                                {header === 'Unique ID' && (
                                  <span className="ml-1 text-xs text-gray-500">(auto-generated)</span>
                                )}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                {header === 'Unique ID' ? (
                                  <span className="text-sm text-gray-500">Auto-generated</span>
                                ) : (
                                  <select
                                    value={importMapping[header] || ''}
                                    onChange={(e) => handleMappingChange(header, e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                  >
                                    <option value="">-- Select column --</option>
                                    {importHeaders.map((importHeader, i) => (
                                      <option key={i} value={importHeader}>
                                        {importHeader}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!isMappingComplete && (
                      <div className="mt-2 text-sm text-yellow-600 flex items-center">
                        <Info className="w-4 h-4 mr-1" />
                        Map all required columns to proceed
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Preview */}
                {isMappingComplete && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 text-gray-800">Step 3: Preview</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            {headers.map((header, index) => (
                              <th
                                key={index}
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importData.slice(0, 5).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {headers.map((header, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate"
                                >
                                  {row[header] || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {importData.length > 5 && (
                            <tr>
                              <td colSpan={headers.length} className="px-4 py-2 text-center text-sm text-gray-500">
                                ... and {importData.length - 5} more rows
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    resetImportState();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={!isMappingComplete || importData.length === 0}
                  className={`px-4 py-2 text-white rounded-md ${!isMappingComplete || importData.length === 0 ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  Import {importData.length} Records
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
                          <span className="ml-2 text-xs text-gray-500">
                            ({group.memberCount} members)
                          </span>
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
