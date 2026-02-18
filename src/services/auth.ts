/**
 * Authentication API client
 */

import type {
  AuthStatusResponse,
  LoginRequest,
  CompleteSetupRequest,
  UpdateConfigRequest,
  FactoryResetRequest,
} from '../../server/src/types';
import type { KioskConfig } from '../contexts/ConfigContext';

const API_BASE = '/api';

/**
 * Fetch wrapper with credentials support
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get authentication status
 */
export async function getAuthStatus(): Promise<AuthStatusResponse> {
  return apiFetch<AuthStatusResponse>('/auth/status');
}

/**
 * Initialize first-time setup (generate code for TV display)
 */
export async function initSetup(): Promise<{ firstTimeCode: string; expiresIn: number }> {
  return apiFetch<{ firstTimeCode: string; expiresIn: number }>('/auth/init-setup', {
    method: 'POST',
  });
}

/**
 * Complete first-time setup with code + PIN + config
 */
export async function completeSetup(data: CompleteSetupRequest): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/auth/complete-setup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Login with PIN
 */
export async function login(pin: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pin } as LoginRequest),
  });
}

/**
 * Logout (destroy session)
 */
export async function logout(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<KioskConfig> {
  return apiFetch<KioskConfig>('/config');
}

/**
 * Update configuration (requires PIN re-verification)
 */
export async function updateConfig(config: KioskConfig, pin: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/config', {
    method: 'PUT',
    body: JSON.stringify({ config, pin } as UpdateConfigRequest),
  });
}

/**
 * Factory reset (delete all data, requires PIN)
 */
export async function factoryReset(pin: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/config/factory-reset', {
    method: 'POST',
    body: JSON.stringify({ pin } as FactoryResetRequest),
  });
}
