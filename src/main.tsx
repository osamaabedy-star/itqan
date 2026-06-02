import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error("GLOBAL_ERROR_STACK:", event.error?.stack || event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("UNHANDLED_REJECTION_STACK:", event.reason?.stack || event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
