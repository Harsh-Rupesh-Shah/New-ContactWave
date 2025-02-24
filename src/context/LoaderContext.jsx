import React, { createContext, useState, useContext, useEffect } from 'react';

const LoaderContext = createContext(null);

export const LoaderProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleShowLoader = () => setLoading(true);
    const handleHideLoader = () => setLoading(false);

    // Create a div element for custom events
    const loaderDiv = document.createElement('div');
    loaderDiv.id = 'loader-context';
    document.body.appendChild(loaderDiv);

    // Add event listeners
    loaderDiv.addEventListener('showLoader', handleShowLoader);
    loaderDiv.addEventListener('hideLoader', handleHideLoader);

    return () => {
      // Clean up
      loaderDiv.removeEventListener('showLoader', handleShowLoader);
      loaderDiv.removeEventListener('hideLoader', handleHideLoader);
      document.body.removeChild(loaderDiv);
    };
  }, []);

  return (
    <LoaderContext.Provider value={{ loading, setLoading }}>
      {children}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-700">Loading...</p>
          </div>
        </div>
      )}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderContext);