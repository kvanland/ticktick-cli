/**
 * TickTick Skill - Shared Library
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

// Paths
const CONFIG_DIR = join(homedir(), '.clawdbot', 'ticktick');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
const TOKEN_PATH = join(CONFIG_DIR, 'tokens.json');

// API URLs
const API_URLS = {
  global: 'https://api.ticktick.com/open/v1',
  china: 'https://api.dida365.com/open/v1',
};

const OAUTH_URLS = {
  global: {
    authorize: 'https://ticktick.com/oauth/authorize',
    token: 'https://ticktick.com/oauth/token',
  },
  china: {
    authorize: 'https://dida365.com/oauth/authorize',
    token: 'https://dida365.com/oauth/token',
  },
};

// Priority enum
export const Priority = {
  None: 0,
  Low: 1,
  Medium: 3,
  High: 5,
};

/**
 * Load config from file or environment
 */
export async function loadConfig() {
  // Try environment variables first
  if (process.env.TICKTICK_CLIENT_ID && process.env.TICKTICK_CLIENT_SECRET) {
    return {
      clientId: process.env.TICKTICK_CLIENT_ID,
      clientSecret: process.env.TICKTICK_CLIENT_SECRET,
      redirectUri: process.env.TICKTICK_REDIRECT_URI || 'http://localhost:18888/callback',
      region: process.env.TICKTICK_REGION || 'global',
    };
  }

  // Try config file
  if (existsSync(CONFIG_PATH)) {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  }

  throw new Error(`No config found. Create ${CONFIG_PATH} or set TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET environment variables.`);
}

/**
 * Load stored tokens
 */
export async function loadTokens() {
  if (!existsSync(TOKEN_PATH)) {
    return null;
  }
  const content = await readFile(TOKEN_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save tokens
 */
export async function saveTokens(tokens) {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

/**
 * Clear tokens
 */
export async function clearTokens() {
  if (existsSync(TOKEN_PATH)) {
    await writeFile(TOKEN_PATH, '', 'utf-8');
  }
}

/**
 * Check if token is expired (with 60s buffer)
 */
export function isTokenExpired(tokens) {
  return Date.now() >= tokens.expiresAt - 60000;
}

/**
 * Get OAuth authorization URL
 */
export function getAuthorizationUrl(config) {
  const urls = OAUTH_URLS[config.region || 'global'];
  const state = generateState();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'tasks:read tasks:write',
    state,
  });
  return {
    url: `${urls.authorize}?${params.toString()}`,
    state,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCode(config, code) {
  const urls = OAUTH_URLS[config.region || 'global'];
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(urls.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    storedAt: Date.now(),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(config, refreshToken) {
  const urls = OAUTH_URLS[config.region || 'global'];
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(urls.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    tokenType: data.token_type,
    storedAt: Date.now(),
  };
}

/**
 * Get a valid access token, refreshing if needed
 */
export async function getValidAccessToken() {
  const config = await loadConfig();
  const tokens = await loadTokens();

  if (!tokens) {
    throw new Error('Not authenticated. Run: node scripts/auth.mjs setup');
  }

  if (isTokenExpired(tokens)) {
    const newTokens = await refreshAccessToken(config, tokens.refreshToken);
    await saveTokens(newTokens);
    return newTokens.accessToken;
  }

  return tokens.accessToken;
}

/**
 * Make an API request
 */
export async function apiRequest(method, path, body = undefined) {
  const config = await loadConfig();
  const accessToken = await getValidAccessToken();
  const baseUrl = API_URLS[config.region || 'global'];
  const url = `${baseUrl}${path}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed (${response.status}): ${error}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}

/**
 * Generate random state for CSRF protection
 */
function generateState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (const value of randomValues) {
    result += chars[value % chars.length];
  }
  return result;
}

/**
 * Parse reminder string (e.g., "15m", "1h", "1d") to iCalendar TRIGGER format
 */
export function parseReminder(reminder) {
  if (!reminder) return null;
  const match = reminder.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  if (unit === 'm') return `TRIGGER:-PT${n}M`;
  if (unit === 'h') return `TRIGGER:-PT${n}H`;
  if (unit === 'd') return `TRIGGER:-P${n}D`;
  return null;
}

/**
 * Parse priority string to number
 */
export function parsePriority(priority) {
  if (!priority) return undefined;
  const p = priority.toLowerCase();
  if (p === 'none') return Priority.None;
  if (p === 'low') return Priority.Low;
  if (p === 'medium') return Priority.Medium;
  if (p === 'high') return Priority.High;
  return undefined;
}

/**
 * Format priority number to string
 */
export function formatPriority(priority) {
  if (priority === Priority.None) return 'none';
  if (priority === Priority.Low) return 'low';
  if (priority === Priority.Medium) return 'medium';
  if (priority === Priority.High) return 'high';
  return 'none';
}

export { CONFIG_PATH, TOKEN_PATH, CONFIG_DIR };
