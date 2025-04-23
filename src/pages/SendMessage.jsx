import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Image, Video, X, Check } from 'lucide-react';
import api from '../api/axios';
import axios from 'axios'; // Import axios directly for debugging
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import TemplateList from '../components/TemplateList';

function SendMessage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState("");
  const [category, setCategory] = useState("utility");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [testMobileNumber, setTestMobileNumber] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isTestMessage, setIsTestMessage] = useState(false);
  const [results, setResults] = useState([]);
  const [isTemplateReady, setIsTemplateReady] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    // Get selected recipients from localStorage
    const selectedRecipientsStr = localStorage.getItem('selectedUsersForMessage');
    if (selectedRecipientsStr) {
      try {
        const selectedRecipients = JSON.parse(selectedRecipientsStr);
        setSelectedRows(selectedRecipients);
      } catch (error) {
        console.error('Error parsing selected recipients:', error);
        toast.error('Error loading selected recipients');
        navigate('/message-center');
      }
    } else {
      toast.error('No recipients selected');
      navigate('/message-center');
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter((file) => {
      if (messageType === "image") return file.type.startsWith("image/");
      if (messageType === "video") return file.type.startsWith("video/");
      return false;
    });

    if (validFiles.length !== selectedFiles.length) {
      toast.error(`Some files were invalid for type: ${messageType}`);
    }

    setFiles(validFiles);
    setFilePreviews(validFiles.map((file) => URL.createObjectURL(file)));
  };

  const handleSendMessage = async () => {
    try {
      if (!selectedTemplate) {
        toast.error("Please select a template first");
        return;
      }
  
      console.log("Starting send message process...");
      console.log("Selected template:", selectedTemplate);
  
      // Get recipients
      let recipients;
      if (isTestMessage) {
        if (!testMobileNumber.trim()) {
          toast.error("Please enter a test mobile number");
          return;
        }
        recipients = [{ phone: testMobileNumber.trim(), data: {} }];
      } else {
        if (!selectedRows || selectedRows.length === 0) {
          toast.error("No recipients selected");
          return;
        }
  
        // Map selected rows to recipients format
        recipients = selectedRows.map(row => ({
          phone: row[4], // Assuming phone number is at index 4
          data: {
            name: `${row[1]} ${row[2]} ${row[3]}`.trim(), // Combine name fields
            param1: row[1], // First name
            param2: row[2], // Middle name
            param3: row[3], // Last name
            param4: row[4], // Phone
            // Add more parameters as needed
          }
        }));
      }
  
      console.log("Prepared recipients:", recipients);
  
      // Prepare form data
      const formData = new FormData();
      formData.append("header", header);
      formData.append("message", message);
      formData.append("recipients", JSON.stringify(recipients));
      formData.append("template", JSON.stringify(selectedTemplate));
      formData.append("hasParameters", selectedTemplate.hasParameters); // Include hasParameters
      files.forEach((file) => formData.append("files", file));
  
      // Log FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(`FormData entry - ${key}:`, value);
      }
  
      // Make the API call
      console.log("Making API call to send-whatsapp...");
      const response = await api.post('/api/send-whatsapp', formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
  
      console.log("API response:", response.data);
  
      if (response.data.success) {
        setResults(response.data.results);
        toast.success(response.data.message);
  
        // Clear form
        setMessage("");
        setHeader("");
        setFiles([]);
        setFilePreviews([]);
        setSelectedTemplate(null);
        localStorage.removeItem('selectedUsersForMessage');
  
        // Navigate back after success
        setTimeout(() => {
          navigate('/message-center');
        }, 2000);
      } else {
        throw new Error(response.data.error || "Failed to send messages");
      }
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error(error.response?.data?.message || 'Failed to send messages');
    }
  };
  

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateSelect = (template) => {
    console.log("Template selected:", template);
    setSelectedTemplate(template);
    setIsTemplateReady(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <MessageSquare className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-2xl font-semibold text-gray-800">Send Message</h2>
          </div>

          <div className="space-y-6">
            {/* Message Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Type
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setMessageType("text")}
                  className={`px-4 py-2 rounded-md ${
                    messageType === "text"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setMessageType("image")}
                  className={`px-4 py-2 rounded-md ${
                    messageType === "image"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Image
                </button>
                <button
                  onClick={() => setMessageType("video")}
                  className={`px-4 py-2 rounded-md ${
                    messageType === "video"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            {/* File Upload */}
            {messageType !== "text" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload {messageType === "image" ? "Image" : "Video"}
                </label>
                <input
                  type="file"
                  accept={messageType === "image" ? "image/*" : "video/*"}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
                {filePreviews.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-4">
                    {filePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        {messageType === "image" ? (
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-24 w-24 object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            src={preview}
                            className="h-24 w-24 object-cover rounded-lg"
                            controls
                          />
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="utility">Utility</option>
                <option value="marketing">Marketing</option>
                <option value="authentication">Authentication</option>
              </select>
              <div className="mt-4">
                <TemplateList
                  selectedCategory={category}
                  onTemplateSelect={handleTemplateSelect}
                />
              </div>
            </div>

            {/* Test Mode Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="testMode"
                checked={isTestMessage}
                onChange={(e) => setIsTestMessage(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="testMode" className="ml-2 block text-sm text-gray-900">
                Test Mode
              </label>
            </div>

            {/* Test Mobile Number */}
            {isTestMessage && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Test Mobile Number
                </label>
                <input
                  type="tel"
                  value={testMobileNumber}
                  onChange={(e) => setTestMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Recipients Summary */}
            {!isTestMessage && selectedRows.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700">Selected Recipients</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedRows.length} recipient(s) selected
                </p>
              </div>
            )}

            {/* Send Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSendMessage}
                disabled={!selectedTemplate || (isTestMessage ? !testMobileNumber : selectedRows.length === 0)}
                className={`flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 ${
                  (!selectedTemplate || (isTestMessage ? !testMobileNumber : selectedRows.length === 0)) 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
              >
                <Send className="h-5 w-5 mr-2" />
                Send Message
              </button>
            </div>

            {/* Results Display */}
            {results.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Sending Results
                </h3>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center p-3 rounded-md ${
                        result.status === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {result.status === "success" ? (
                        <Check className="h-5 w-5 mr-2" />
                      ) : (
                        <X className="h-5 w-5 mr-2" />
                      )}
                      <span>
                        {result.phone}: {result.status}
                        {result.error && ` - ${result.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendMessage;