import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ==========================================
// main.jsx — entry point
//
// BrowserRouter lives here (not in App) so that in tests
// you can wrap <App /> with MemoryRouter or StaticRouter instead.
// ==========================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
