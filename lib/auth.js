/**
 * TickTick CLI - Authentication operations
 */

import {
  loadConfig,
  loadTokens,
  saveTokens,
  clearTokens,
  isTokenExpired,
  getAuthorizationUrl,
  exchangeCode,
  refreshAccessToken,
  TOKEN_PATH,
} from './core.js';

/**
 * Check authentication status
 * @returns {Promise<object>}
 */
export async function status(deps = {}) {
  const tokens = await loadTokens(deps);

  if (!tokens || !tokens.accessToken) {
    return {
      authenticated: false,
      message: 'Not authenticated. Run: ticktick auth login',
    };
  }

  const expired = isTokenExpired(tokens);
  const expiresIn = expired ? 0 : Math.floor((tokens.expiresAt - Date.now()) / 1000);

  return {
    authenticated: true,
    expired,
    expiresAt: new Date(tokens.expiresAt).toISOString(),
    expiresIn: `${expiresIn} seconds`,
    tokenPath: TOKEN_PATH,
  };
}

/**
 * Get authorization URL for OAuth login
 * @returns {Promise<object>}
 */
export async function login(deps = {}) {
  const config = await loadConfig(deps);
  const { url, state } = getAuthorizationUrl(config);

  return {
    message: 'Open the authorization URL in your browser',
    url,
    state,
    nextStep: 'After authorizing, run: ticktick auth exchange YOUR_CODE',
  };
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code
 * @returns {Promise<object>}
 */
export async function exchange(code, deps = {}) {
  const config = await loadConfig(deps);
  const tokens = await exchangeCode(config, code, deps);
  await saveTokens(tokens, deps);

  return {
    success: true,
    message: 'Authentication successful!',
    expiresAt: new Date(tokens.expiresAt).toISOString(),
    tokenPath: TOKEN_PATH,
  };
}

/**
 * Refresh access token
 * @returns {Promise<object>}
 */
export async function refresh(deps = {}) {
  const config = await loadConfig(deps);
  const tokens = await loadTokens(deps);

  if (!tokens || !tokens.refreshToken) {
    throw new Error('No refresh token available. Run: ticktick auth login');
  }

  const newTokens = await refreshAccessToken(config, tokens.refreshToken, deps);
  await saveTokens(newTokens, deps);

  return {
    success: true,
    message: 'Token refreshed successfully!',
    expiresAt: new Date(newTokens.expiresAt).toISOString(),
  };
}

/**
 * Logout (clear tokens)
 * @returns {Promise<object>}
 */
export async function logout(deps = {}) {
  await clearTokens(deps);

  return {
    success: true,
    message: 'Logged out. Tokens cleared.',
  };
}
