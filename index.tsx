
// Import the React library for component logic
import React from 'react';
// Import the ReactDOM library for rendering into the browser DOM
import ReactDOM from 'react-dom/client';
// Import the main App component which contains all UI and logic
import App from './App';

// Attempt to find the HTML element with id 'root' defined in index.html
const rootElement = document.getElementById('root');
// If the root element is missing, throw an error to prevent silent failure
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create a React Root using the concurrent rendering features of React 19
const root = ReactDOM.createRoot(rootElement);
// Render the application wrapped in StrictMode for development safety checks
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
