/**
 * Authentication Service
 * Handles login, logout, and session management
 */

import api, { ApiResponse } from './api';
import type { LoginRequest, LoginResponse } from '../types';

const LOGIN_ENDPOINT = import.meta.env.VITE_LOGIN_ENDPOINT || '/auth/login';

/**
 * Login with student ID or teacher ID
 */
export async function login(
  id: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  const loginData: LoginRequest = { id, password };
  return api.apiFetch<LoginResponse>(LOGIN_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(loginData),
  });
}

/**
 * Logout current user
 */
export function logout(): void {
  // Clear any stored session data
  sessionStorage.clear();
  localStorage.removeItem('user');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  // This will be implemented with proper session management
  return false;
}

export default {
  login,
  logout,
  isAuthenticated,
};
