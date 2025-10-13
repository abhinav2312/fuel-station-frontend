// Simple environment-based API configuration
const getApiBaseUrl = () => {
    // Check for explicit API URL first (highest priority)
    if ((import.meta as any).env?.VITE_API_URL) {
        return (import.meta as any).env.VITE_API_URL;
    }

    // Check for Vite's MODE first, then fallback to VITE_ENVIRONMENT
    const environment = (import.meta as any).env?.MODE || (import.meta as any).env?.VITE_ENVIRONMENT || 'production';

    if (environment === 'development') {
        return 'http://localhost:4000';
    } else {
        return 'https://fuel-station-backend.onrender.com';
    }
};

const API_BASE_URL = getApiBaseUrl();

// Configure axios to use the correct base URL
import axios from 'axios';

// Create the configured axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Override the default axios instance to use our configuration
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Export both the configured instance and the base URL
export default API_BASE_URL;
export { apiClient };

// Also export axios as the configured version
export { axios };
