import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppContextProvider } from './contexts/AppContextProvider';
import ThemeWrapper from './components/theme/ThemeWrapper';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppContextProvider>
      <ThemeWrapper>
        <App />
      </ThemeWrapper>
    </AppContextProvider>
  </React.StrictMode>,
);
