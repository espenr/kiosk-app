import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppContextProvider } from './contexts/AppContextProvider';
import ThemeWrapper from './components/theme/ThemeWrapper';
import { checkVersionAndClearCache } from './utils/versionBootstrap';
import './index.css';

/**
 * Bootstrap application with version check
 * Clears localStorage if version changed to ensure clean start
 */
async function bootstrap() {
  // Check version and clear cache if needed (before mounting React)
  await checkVersionAndClearCache();

  // Get root element
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Root element not found in the DOM');
  }

  // Mount React application
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
}

// Start the application
bootstrap();

