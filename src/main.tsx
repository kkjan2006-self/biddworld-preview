import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register only in production; BASE_URL keeps the worker correctly scoped on Pages and root hosting.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
      .catch((error: unknown) => {
        // A failed optional offline enhancement must never prevent app startup.
        console.warn('BiddWorld offline support could not be registered.', error);
      });
  }, { once: true });
}
