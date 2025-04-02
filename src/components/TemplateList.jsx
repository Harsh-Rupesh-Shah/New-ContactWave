import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ParameterModal from './ParameterModal';
import api from '../api/axios';
import toast from 'react-hot-toast';

const TemplateList = ({ selectedCategory, onTemplateSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/get-all-templates');
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const allTemplates = response.data.templates || [];
      const filteredTemplates = allTemplates.filter((template) => {
        const templateCategory = template.category?.toLowerCase();
        const selectedCategoryLower = selectedCategory?.toLowerCase();
        return templateCategory === selectedCategoryLower;
      });

      setTemplates(filteredTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates');
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template) => {
    if (!template || !template.template) {
      console.error('Invalid template structure');
      return;
    }
  
    setSelectedTemplate(template);
    
    // Check if any component has parameters with placeholders
    const hasParameters = template.template.components?.some(component => {
      return component.parameters?.some(param => {
        return param.text && /\{\{\d+\}\}/.test(param.text);
      });
    });
  
    if (hasParameters) {
      setShowParameterModal(true);
    } else {
      onTemplateSelect(template); // Directly select template if no parameters
    }
  };

  const handleDelete = async (templateId, templateName) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        console.log("before delete:", templateId)
        const response = await api.delete(
          `/api/delete-template/${templateId}/${templateName}`
        );
        if (response.data.success) {
          toast.success('Template deleted successfully');
          await fetchTemplates();
        }
      } catch (error) {
        console.error('Error deleting template:', error);
        toast.error('Failed to delete template');
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="text-green-500" />;
      case 'rejected':
        return <AlertCircle className="text-red-500" />;
      default:
        return <Clock className="text-yellow-500" />;
    }
  };

  const handleSendWithParameters = (templateWithParams) => {
    if (!templateWithParams || !templateWithParams.template) {
      console.error('Invalid template with parameters');
      return;
    }
    onTemplateSelect(templateWithParams);
    setShowParameterModal(false);
  };

  if (loading) {
    return <div className="text-center py-4">Loading templates...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  if (templates.length === 0) {
    return <div className="text-gray-500 py-4">No templates found for the selected category.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {templates.map((template) => (
        <div
          key={template.template.name}
          className="bg-white border border-gray-300 rounded-lg shadow-md transition-transform transform hover:-translate-y-1 flex flex-col cursor-pointer"
          onClick={() => handleTemplateClick(template)}
        >
          <div className="flex-1 p-4">
            {template.template.components.map((component, index) => (
              <div key={index} className="bg-gray-100 p-2 rounded mb-2">
                <p className="font-bold text-gray-700">{component.type}</p>
                <p className="mt-1 text-gray-800">
                  {component.parameters
                    ? component.parameters
                        .map((param) => param.text || `{{${index + 1}}}`)
                        .join(', ')
                    : 'No parameters'}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2 border-t border-gray-300 p-4">
            <h3 className="text-lg font-semibold mb-2">{template.template.name}</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">{template.category}</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(template.status)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id, template.template.name);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <ParameterModal
        open={showParameterModal}
        onClose={() => setShowParameterModal(false)}
        template={selectedTemplate}
        onSendWithParameters={handleSendWithParameters}
      />
    </div>
  );
};

export default TemplateList;