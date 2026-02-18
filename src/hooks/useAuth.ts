/**
 * Authentication state hook
 */

import { useState, useEffect } from 'preact/hooks';
import { getAuthStatus, login as apiLogin, logout as apiLogout } from '../services/auth';
import type { AuthStatusResponse } from '../../server/src/types';

interface UseAuthResult {
  authStatus: AuthStatusResponse | null;
  loading: boolean;
  error: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check auth status');
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (pin: string) => {
    try {
      setError(null);
      await apiLogin(pin);
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await apiLogout();
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    authStatus,
    loading,
    error,
    login,
    logout,
    refresh: checkAuth,
  };
}
