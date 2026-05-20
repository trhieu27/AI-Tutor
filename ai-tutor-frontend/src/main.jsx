import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './styles/globals.css';
import { jsx as _jsx } from "react/jsx-runtime";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/_jsx(React.StrictMode, {
  children: /*#__PURE__*/_jsx(GoogleOAuthProvider, {
    clientId: GOOGLE_CLIENT_ID,
    children: /*#__PURE__*/_jsx(BrowserRouter, {
      children: /*#__PURE__*/_jsx(App, {})
    })
  })
}));