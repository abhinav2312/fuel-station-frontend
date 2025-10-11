// API configuration for production
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://fuel-station-backend.onrender.com';

export default API_BASE_URL;
