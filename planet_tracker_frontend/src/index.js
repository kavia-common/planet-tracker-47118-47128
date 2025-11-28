import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import NotificationProvider from './components/NotificationProvider';

// Ensure the NotificationProvider wraps the entire app so that useNotify()
// works anywhere and the ToastRegion is always mounted for rendering notifications.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);
