import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppContextProvider } from './contexts/AppContextProvider';
import ThemeWrapper from './components/theme/ThemeWrapper';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found in the DOM');
}

// Type assertions needed for Preact/React compatibility
/* eslint-disable @typescript-eslint/no-explicit-any */
ReactDOM.createRoot(rootElement).render(
  (<React.StrictMode>
    {(<AppContextProvider>
      {(<ThemeWrapper>
        {(<App />) as any}
      </ThemeWrapper>) as any}
    </AppContextProvider>) as any}
  </React.StrictMode>) as any
);
/* eslint-enable @typescript-eslint/no-explicit-any */
