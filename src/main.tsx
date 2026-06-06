import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error("GLOBAL_ERROR_STACK:", event.error?.stack || event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.stack || event.reason?.message || event.reason);
  const isBenignFirebaseOrNetworkIssue = 
    reasonStr.includes('Could not reach Cloud Firestore') ||
    reasonStr.includes('code=unavailable') ||
    reasonStr.includes('offline') ||
    reasonStr.includes('network-request-failed') ||
    reasonStr.includes('Firebase') ||
    reasonStr.includes('firestore');

  if (isBenignFirebaseOrNetworkIssue) {
    console.warn("Firestore is operating in offline/local cache mode:", event.reason?.message || event.reason);
    event.preventDefault(); // Prevent browser default logging & unhandled exceptions from bubbling
  } else {
    console.error("UNHANDLED_REJECTION_STACK:", event.reason?.stack || event.reason);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
