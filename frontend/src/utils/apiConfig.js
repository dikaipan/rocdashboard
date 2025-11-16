/**
 * API Configuration
 * Handles API base URL for different environments
 * 
 * Usage:
 * - Development: Uses Vite proxy to /api (proxied to http://localhost:5000)
 * - Production: Uses VITE_API_BASE_URL environment variable if set,
 *   otherwise falls back to hardcoded Railway backend URL
 * 
 * Railway Backend: https://rocdashboard-production.up.railway.app/api
 * Vercel Frontend: https://rocdashboard.vercel.app
 * 
 * Note: CORS is configured in Railway backend to allow Vercel domain
 */

// Get API base URL from environment variable or use default
const getApiBaseUrl = () => {
  // Check if we have a custom API URL in environment (works in both dev and prod)
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envApiUrl) {
    // Remove trailing slash if present
    return envApiUrl.replace(/\/$/, '');
  }
  
  // Production fallback - hardcoded Railway backend URL
  if (import.meta.env.PROD) {
    return 'https://rocdashboard-production.up.railway.app/api';
  }
  
  // Default: use relative path for development
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Log API configuration for debugging
console.log('[API Config] Environment:', import.meta.env.MODE);
console.log('[API Config] API Base URL:', API_BASE_URL);
console.log('[API Config] VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '(not set, using fallback)');

