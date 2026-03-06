/**
 * Admin router with authentication flow
 */

import { Router, Route, route } from 'preact-router';
import { useEffect } from 'preact/hooks';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SetupPage } from './pages/SetupPage';
import { SetupWizard } from './pages/SetupWizard';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { RecoveryPage } from './pages/RecoveryPage';
import { FactoryResetPage } from './pages/FactoryResetPage';

export default function AdminRouter() {
  const { authStatus, loading } = useAuth();

  // Enable scrolling on admin pages
  useEffect(() => {
    document.body.classList.add('admin-page');
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, []);

  useEffect(() => {
    if (loading || !authStatus) return;

    const currentPath = window.location.pathname;

    // Don't redirect if on wizard - let user complete setup
    if (currentPath === '/admin/setup/wizard') {
      return;
    }

    // Redirect logic based on auth status
    if (!authStatus.setupComplete) {
      route('/admin/setup', true);
    } else if (!authStatus.authenticated) {
      route('/admin/login', true);
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      route('/admin/settings', true);
    }
  }, [authStatus, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Router>
        <Route path="/admin/setup" component={SetupPage} />
        <Route path="/admin/setup/wizard" component={SetupWizard} />
        <Route path="/admin/login" component={LoginPage} />
        <Route path="/admin/settings" component={SettingsPage} />
        <Route path="/admin/recovery" component={RecoveryPage} />
        <Route path="/admin/reset" component={FactoryResetPage} />
      </Router>
    </div>
  );
}
