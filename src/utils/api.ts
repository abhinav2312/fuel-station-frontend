// API configuration for production
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://fuel-station-backend.onrender.com';

// Configure axios to use the correct base URL
import axios from 'axios';

// Set the base URL for all axios requests
axios.defaults.baseURL = API_BASE_URL;

export default API_BASE_URL;
