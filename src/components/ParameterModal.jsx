import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ParameterModal = ({ open, onClose, template, onSendWithParameters }) => {
  const [parameterValues, setParameterValues] = useState({});
  const [componentParameters, setComponentParameters] = useState([]);

  useEffect(() => {
    if (template?.template?.components) {
      const params = [];
      const initialValues = {};
      
      template.template.components.forEach(component => {
        if (component.type === 'FOOTER') return;
        
        if (component.parameters) {
          component.parameters.forEach(param => {
            if (param.text) {
              const matches = param.text.match(/\{\{(\d+)\}\}/g) || [];
              matches.forEach(match => {
                const index = match.replace(/\D/g, '');
                const paramKey = `${component.type}_${index}`;
                
                if (!params.some(p => p.key === paramKey)) {
                  params.push({
                    componentType: component.type,
                    index,
                    key: paramKey,
                    placeholder: match,
                    fullText: param.text
                  });
                  
                  initialValues[paramKey] = '';
                }
              });
            }
          });
        }
      });
      
      setComponentParameters(params);
      setParameterValues(initialValues);
    }
  }, [template]);

  if (!open || !template) return null;

  // In ParameterModal.js
const handleParameterChange = (key, value) => {
  // Validate input
  if (value.match(/[\n\t]/)) {
    toast.error("Parameters cannot contain newlines or tabs");
    return;
  }
  
  setParameterValues(prev => ({
    ...prev,
    [key]: value
  }));
};

  const handleSubmit = () => {
    const processedComponents = template.template.components.map(component => {
      if (component.type === 'FOOTER') {
        return component;
      }

      if (!component.parameters) return component;
      
      const parameters = component.parameters.map(param => {
        if (!param.text) return param;
        
        let newText = param.text;
        componentParameters
          .filter(p => p.componentType === component.type)
          .forEach(({ placeholder, key }) => {
            const value = parameterValues[key] || '';
            newText = newText.replace(new RegExp(placeholder, 'g'), value);
          });
        
        return {
          ...param,
          text: newText
        };
      });
      
      return {
        ...component,
        parameters
      };
    });

    onSendWithParameters({
      ...template,
      template: {
        ...template.template,
        components: processedComponents
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Enter Template Parameters</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {componentParameters.map((param) => (
            <div key={param.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {param.componentType} Parameter {param.placeholder}
              </label>
              <input
                type="text"
                value={parameterValues[param.key] || ''}
                onChange={(e) => handleParameterChange(param.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Enter value for ${param.placeholder}`}
              />
              <p className="mt-1 text-sm text-gray-500">
                Will replace {param.placeholder} in the template
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParameterModal;