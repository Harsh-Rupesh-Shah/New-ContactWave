import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from cookies
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Show loader for all API calls
    const loaderContext = document.querySelector('#loader-context');
    if (loaderContext) {
      const event = new CustomEvent('showLoader');
      loaderContext.dispatchEvent(event);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Hide loader on response
    const loaderContext = document.querySelector('#loader-context');
    if (loaderContext) {
      const event = new CustomEvent('hideLoader');
      loaderContext.dispatchEvent(event);
    }
    return response;
  },
  (error) => {
    // Hide loader on error
    const loaderContext = document.querySelector('#loader-context');
    if (loaderContext) {
      const event = new CustomEvent('hideLoader');
      loaderContext.dispatchEvent(event);
    }

    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Handle unauthorized - remove token from cookies
          Cookies.remove('token');
          window.location.href = '/login';
          break;
        case 403:
          // Handle forbidden
          break;
        case 404:
          // Handle not found
          break;
        case 500:
          // Handle server error
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default api;