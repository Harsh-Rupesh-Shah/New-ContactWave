import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, Video, FileText } from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function MessageCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [header, setHeader] = useState('');
  const [category, setCategory] = useState('');
  const [sendMode, setSendMode] = useState('whatsapp');
  const [messageType, setMessageType] = useState('text');
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [sendingResults, setSendingResults] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      if (messageType === 'image') return file.type.startsWith('image/');
      if (messageType === 'video') return file.type.startsWith('video/');
      return false;
    });

    if (validFiles.length !== selectedFiles.length) {
      alert(`Only ${messageType} files are allowed.`);
    }

    setFiles(validFiles);
    setFilePreviews(validFiles.map(file => URL.createObjectURL(file)));
  };

  const handleSendMessage = async () => {
    try {
      const formData = new FormData();
      formData.append('header', header);
      formData.append('message', message);
      formData.append('category', category);
      formData.append('sendMode', sendMode);
      formData.append('recipients', JSON.stringify(selectedRecipients));
      files.forEach(file => formData.append('files', file));

      const response = await api.post('/api/send-message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSendingResults(response.data.results);
      setShowReport(true);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Message Center</h2>

          {/* Message Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Select Category</option>
              <option value="marketing">Marketing</option>
              <option value="utility">Utility</option>
              <option value="authentication">Authentication</option>
              <option value="otpless">OTPLess</option>
            </select>
          </div>

          {/* Message Type */}
          {category === 'marketing' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="text">Text Only</option>
                <option value="image">Message with Image</option>
                <option value="video">Message with Video</option>
              </select>
            </div>
          )}

          {/* Header */}
          {(category === 'marketing' || category === 'utility') && messageType === 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Header
              </label>
              <input
                type="text"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter message header"
              />
            </div>
          )}

          {/* Message Content */}
          {(category === 'marketing' || category === 'utility') && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Content
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter your message"
              />
            </div>
          )}

          {/* File Upload */}
          {category === 'marketing' && messageType !== 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload {messageType === 'image' ? 'Images' : 'Videos'}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
                  {messageType === 'image' ? (
                    <Image className="w-8 h-8" />
                  ) : (
                    <Video className="w-8 h-8" />
                  )}
                  <span className="mt-2 text-base">Select files</span>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept={messageType === 'image' ? 'image/*' : 'video/*'}
                  />
                </label>
              </div>
              {filePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {filePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setFiles(files.filter((_, i) => i !== index));
                          setFilePreviews(filePreviews.filter((_, i) => i !== index));
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Send Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send via
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="whatsapp"
                  checked={sendMode === 'whatsapp'}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="form-radio text-indigo-600"
                />
                <span className="ml-2">WhatsApp</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="sms"
                  checked={sendMode === 'sms'}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="form-radio text-indigo-600"
                />
                <span className="ml-2">SMS</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="telegram"
                  checked={sendMode === 'telegram'}
                  onChange={(e) => setSendMode(e.target.value)}
                  className="form-radio text-indigo-600"
                />
                <span className="ml-2">Telegram</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </button>
          </div>
        </div>

        {/* Results Modal */}
        {showReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Sending Results</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sendingResults.map((result, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {result.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    onClick={() => setShowReport(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Implement PDF download logic here
                      console.log('Downloading PDF...');
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Report
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