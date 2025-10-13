// API configuration for production
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://fuel-station-backend.onrender.com';

// Configure axios to use the correct base URL
import axios from 'axios';

// Set the base URL for all axios requests - this will fix ALL pages
axios.defaults.baseURL = API_BASE_URL;

// Also create an axios instance with the base URL
const apiClient = axios.create({
    baseURL: API_BASE_URL
});

// Make sure axios is configured globally
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

export default API_BASE_URL;
export { apiClient };
