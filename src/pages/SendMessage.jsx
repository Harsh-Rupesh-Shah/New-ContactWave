import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Image, Video, X, Check } from 'lucide-react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import TemplateList from '../components/TemplateList';
import ParameterModal from '../components/ParameterModal';

function SendMessage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState("");
  const [category, setCategory] = useState("utility");
  const [sendMode, setSendMode] = useState("whatsapp");
  const [results, setResults] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState(null);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [testMobileNumber, setTestMobileNumber] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isTestMessage, setIsTestMessage] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [spreadsheetData, setSpreadsheetData] = useState([]);
  const [isTemplateReady, setIsTemplateReady] = useState(false);

  useEffect(() => {
    console.log("Selected Template Updated:", selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        const spreadsheetId = localStorage.getItem('selectedSpreadsheetId');
        if (!spreadsheetId) {
          toast.error('No spreadsheet selected');
          navigate('/spreadsheet-setup');
          return;
        }
        setActiveSpreadsheetId(spreadsheetId);

        const response = await api.get('/api/fetch-registrations', {
          params: { spreadsheetId }
        });

        if (response.data && response.data.length > 0) {
          setHeaders(response.data[0]);
          setSpreadsheetData(response.data.slice(1));
        }
      } catch (error) {
        console.error('Error fetching headers:', error);
        toast.error('Failed to fetch spreadsheet data');
      }
    };
    fetchHeaders();
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

  // const handleSendMessage = async () => {
  //   if (!selectedTemplate) {
  //     toast.error("Please select a template first");
  //     return;
  //   }

  //   console.log("Sending template:", selectedTemplate);

  //   if (!isTestMessage && selectedRows.length === 0) {
  //     toast.error("Please select recipients");
  //     return;
  //   }

  //   try {
  //     // Find phone number column
  //     const phoneColumnVariants = ["phone number", "phone", "mobile number", "mobile"];
  //     let phoneIndex = -1;
  //     for (let variant of phoneColumnVariants) {
  //       phoneIndex = headers.findIndex(header => 
  //         header.toLowerCase().includes(variant.toLowerCase())
  //       );
  //       if (phoneIndex !== -1) break;
  //     }

  //     if (phoneIndex === -1) {
  //       toast.error("Could not find phone number column in spreadsheet");
  //       return;
  //     }

  //     // Prepare recipients
  //     let formattedRecipients = isTestMessage 
  //       ? [{ phone: testMobileNumber.trim(), data: {} }]
  //       : selectedRows.map(row => ({
  //           phone: row[phoneIndex],
  //           data: Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))
  //         }));

  //     const formData = new FormData();
  //     formData.append("header", header);
  //     formData.append("message", message);
  //     formData.append("recipients", JSON.stringify(formattedRecipients));
  //     formData.append("template", JSON.stringify(selectedTemplate));
  //     files.forEach((file) => formData.append("files", file));

  //     const response = await api.post('/api/send-whatsapp', formData, {
  //       headers: { "Content-Type": "multipart/form-data" }
  //     });

  //     if (response.data.success) {
  //       setResults(response.data.results);
  //       toast.success(response.data.message);
        
  //       // Clear form after successful send
  //       setMessage("");
  //       setHeader("");
  //       setFiles([]);
  //       setFilePreviews([]);
  //       setSelectedTemplate(null);
  //       setSelectedRows([]);
  //     }
  //   } catch (error) {
  //     console.error('Error sending messages:', error);
  //     toast.error(error.response?.data?.message || 'Failed to send messages');
  //   }
  // };


  const handleSendMessage = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first.");
      return;
    }
  
    console.log("Selected Template:", selectedTemplate);
  
    if (isTestMessage && !testMobileNumber.trim()) {
      toast.error("Please enter a mobile number for the test message.");
      return;
    }
  
    if (!isTestMessage && (!selectedRows || selectedRows.length === 0)) {
      toast.error("Please select at least one recipient.");
      return;
    }
  
    try {
      const phoneColumnVariants = [
        "phone number", "phone", "mobile number", "mobilenumber", 
        "mobile no", "mobileno", "mob", "MOB", "phone no"
      ];
      
      let phoneIndex = -1;
      for (let variant of phoneColumnVariants) {
        phoneIndex = headers.findIndex(
          (header) => header.toLowerCase() === variant.toLowerCase()
        );
        if (phoneIndex !== -1) break;
      }
  
      if (phoneIndex === -1) {
        toast.error("No valid phone/mobile number column found.");
        return;
      }
  
      // Prepare recipients
      let formattedRecipients = [];
      if (isTestMessage) {
        formattedRecipients = [{ phone: testMobileNumber.trim(), data: {} }];
      } else {
        formattedRecipients = spreadsheetData
          .filter((row) => selectedRows.some(
            (selected) => selected[phoneIndex]?.trim() === row[phoneIndex]?.trim()
          ))
          .map((row) => ({
            phone: row[phoneIndex],
            data: Object.fromEntries(
              headers.map((header, index) => [header, row[index] || ""])
            ),
          }));
      }
  
      if (formattedRecipients.length === 0) {
        toast.error("No valid recipients available.");
        return;
      }
  
      // Prepare form data
      const formData = new FormData();
      formData.append("header", header);
      formData.append("message", message);
      formData.append("recipients", JSON.stringify(formattedRecipients));
      formData.append("template", JSON.stringify(selectedTemplate));
      files.forEach((file) => formData.append("files", file));
  
      // Log the payload for debugging
      console.log("Sending payload:", {
        header,
        message,
        recipients: formattedRecipients,
        template: selectedTemplate,
        fileCount: files.length
      });
  
      // Make the API call
      const response = await api.post('/api/send-whatsapp', formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      if (response.data.success) {
        setResults(response.data.results);
        toast.success(response.data.message);
        // Reset form
        setMessage("");
        setHeader("");
        setFiles([]);
        setFilePreviews([]);
        setSelectedTemplate(null);
        setSelectedRows([]);
      } else {
        throw new Error(response.data.error || "Failed to send message.");
      }
    } catch (error) {
      console.error(`Error sending messages:`, error);
      toast.error(error.response?.data?.message || 'Failed to send messages');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };


  const handleTemplateSelect = (template) => {
    console.log("Selected Template:", template);
    setSelectedTemplate(template);
    setIsTemplateReady(true); // Mark template as ready
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

            {/* Send Button */}
            <div className="flex justify-end">
            <button
  onClick={handleSendMessage}
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