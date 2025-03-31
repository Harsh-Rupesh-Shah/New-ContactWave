import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X, Check } from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function SendMessage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get selected users from localStorage
    const storedUsers = localStorage.getItem('selectedUsersForMessage');
    if (storedUsers) {
      setSelectedUsers(JSON.parse(storedUsers));
    } else {
      // If no users selected, redirect back
      navigate('/message-center');
    }
  }, [navigate]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      // Here you would implement your actual message sending logic
      // This could be an API call to your backend or integration with email service
      const response = await api.post('/api/send-messages', {
        users: selectedUsers,
        message,
        subject,
      });

      if (response.data.success) {
        toast.success(`Message sent to ${selectedUsers.length} recipients`);
        navigate('/message-center');
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error('Failed to send messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Mail className="w-6 h-6 mr-2" />
            Send Message
          </h2>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">
              Recipients ({selectedUsers.length})
            </h3>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2">
              {selectedUsers.map((user, index) => (
                <div key={index} className="flex items-center mb-2 p-2 hover:bg-gray-50">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">
                    {user[1]} {user[3]} ({user[4]}) {/* Adjust indices based on your data structure */}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Message subject"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Type your message here..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/message-center')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className={`px-4 py-2 text-white rounded-md ${loading || !message.trim() ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendMessage;