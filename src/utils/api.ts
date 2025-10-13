// API configuration for production
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://fuel-station-backend.onrender.com';

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
