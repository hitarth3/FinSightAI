import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import './index.css'
import App from './App.tsx'

// Global fetch interceptor to handle 401 Unauthorized API responses
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const isBackendCall = url && (
      url.includes('/api/') || 
      url.includes(import.meta.env.VITE_API_URL || 'localhost:8000')
    );
    const isPublicAuth = url && (
      url.includes('/api/auth/login') || 
      url.includes('/api/auth/register') || 
      url.includes('/api/auth/verify-otp') ||
      url.includes('/api/auth/google')
    );
    if (isBackendCall && !isPublicAuth) {
      window.dispatchEvent(new CustomEvent('unauthorized-api-call'));
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
