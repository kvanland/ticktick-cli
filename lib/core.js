/**
 * TickTick CLI - Core Library
 * Config, tokens, OAuth, and API functions
 */

import { readFile as readFileFs, writeFile as writeFileFs, mkdir as mkdirFs } from 'node:fs/promises';
import { existsSync as existsSyncFs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Config paths (XDG-compliant)
export const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'ticktick');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
export const TOKEN_PATH = join(CONFIG_DIR, 'tokens.json');

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

// Valid regions
const VALID_REGIONS = ['global', 'china'];

// Priority enum
export const Priority = {
  None: 0,
  Low: 1,
  Medium: 3,
  High: 5,
};

/**
 * Validate and normalize region
 */
function validateRegion(region) {
  const r = (region || 'global').toLowerCase();
  if (!VALID_REGIONS.includes(r)) {
    throw new Error(`Invalid region "${region}". Must be one of: ${VALID_REGIONS.join(', ')}`);
  }
  return r;
}

/**
 * Load config from file or environment
 */
export async function loadConfig(deps = {}) {
  const { readFile = readFileFs, existsSync = existsSyncFs } = deps;
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
    try {
      return JSON.parse(content);
    } catch {
      throw new Error('Invalid config file. Please run "ticktick setup" to reconfigure.');
    }
  }

  throw new Error(`No config found. Run 'ticktick setup' or create ${CONFIG_PATH}`);
}

/**
 * Save config to file
 */
export async function saveConfig(config, deps = {}) {
  const { writeFile = writeFileFs } = deps;
  await ensureConfigDir(deps);
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Ensure config directory exists with secure permissions
 */
async function ensureConfigDir(deps = {}) {
  const { existsSync = existsSyncFs, mkdir = mkdirFs } = deps;
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Check if config exists
 */
export function hasConfig(deps = {}) {
  const { existsSync = existsSyncFs } = deps;
  if (process.env.TICKTICK_CLIENT_ID && process.env.TICKTICK_CLIENT_SECRET) {
    return true;
  }
  return existsSync(CONFIG_PATH);
}

/**
 * Load stored tokens
 */
export async function loadTokens(deps = {}) {
  const { readFile = readFileFs, existsSync = existsSyncFs } = deps;
  if (!existsSync(TOKEN_PATH)) {
    return null;
  }
  const content = await readFile(TOKEN_PATH, 'utf-8');
  if (!content.trim()) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    // Corrupted token file, treat as not authenticated
    return null;
  }
}

/**
 * Save tokens
 */
export async function saveTokens(tokens, deps = {}) {
  const { writeFile = writeFileFs } = deps;
  await ensureConfigDir(deps);
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

/**
 * Clear tokens
 */
export async function clearTokens(deps = {}) {
  const { writeFile = writeFileFs, existsSync = existsSyncFs } = deps;
  if (existsSync(TOKEN_PATH)) {
    await writeFile(TOKEN_PATH, '', { mode: 0o600 });
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
  const urls = OAUTH_URLS[validateRegion(config.region)];
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
export async function exchangeCode(config, code, deps = {}) {
  const { fetchFn = fetch } = deps;
  const urls = OAUTH_URLS[validateRegion(config.region)];
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });

  const response = await fetchFn(urls.token, {
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
export async function refreshAccessToken(config, refreshToken, deps = {}) {
  const { fetchFn = fetch } = deps;
  const urls = OAUTH_URLS[validateRegion(config.region)];
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetchFn(urls.token, {
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
    throw new Error('Not authenticated. Run: ticktick auth login');
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
export async function apiRequest(method, path, body = undefined, deps = {}) {
  const { fetchFn = fetch } = deps;
  const config = await loadConfig();
  const accessToken = await getValidAccessToken();
  const baseUrl = API_URLS[validateRegion(config.region)];
  const url = `${baseUrl}${path}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetchFn(url, {
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
 * @param {string} reminder - Reminder string like "15m", "1h", "1d"
 * @returns {string|null} iCalendar TRIGGER format, or null if not provided
 * @throws {Error} If reminder is provided but invalid
 */
export function parseReminder(reminder) {
  if (!reminder) return null;
  const match = reminder.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid reminder "${reminder}". Use format like: 15m, 1h, 1d`);
  }
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  if (unit === 'm') return `TRIGGER:-PT${n}M`;
  if (unit === 'h') return `TRIGGER:-PT${n}H`;
  if (unit === 'd') return `TRIGGER:-P${n}D`;
  return null;
}

/**
 * Parse priority string to number
 * @param {string} priority - Priority string (none, low, medium, high)
 * @returns {number|undefined} Priority value, or undefined if not provided
 * @throws {Error} If priority is provided but invalid
 */
export function parsePriority(priority) {
  if (!priority) return undefined;
  const p = priority.toLowerCase();
  if (p === 'none') return Priority.None;
  if (p === 'low') return Priority.Low;
  if (p === 'medium') return Priority.Medium;
  if (p === 'high') return Priority.High;
  throw new Error(`Invalid priority "${priority}". Valid options: none, low, medium, high`);
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

/**
 * Get short ID (first 8 characters)
 */
export function shortId(id) {
  if (!id) return '';
  return id.slice(0, 8);
}

/**
 * Check if an ID is a short ID (8 chars or less)
 */
export function isShortId(id) {
  return id && id.length <= 8;
}
