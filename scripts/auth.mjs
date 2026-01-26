#!/usr/bin/env node
/**
 * TickTick Authentication Script
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
  CONFIG_PATH,
  TOKEN_PATH,
} from './lib.mjs';

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'setup':
        await setup();
        break;
      case 'exchange':
        if (!arg) {
          console.error('Usage: node auth.mjs exchange AUTH_CODE');
          process.exit(1);
        }
        await exchange(arg);
        break;
      case 'refresh':
        await refresh();
        break;
      case 'logout':
        await logout();
        break;
      default:
        console.log('TickTick Authentication');
        console.log('');
        console.log('Commands:');
        console.log('  status   - Check authentication status');
        console.log('  setup    - Get authorization URL');
        console.log('  exchange - Exchange auth code for tokens');
        console.log('  refresh  - Refresh access token');
        console.log('  logout   - Clear stored tokens');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function showStatus() {
  const tokens = await loadTokens();
  
  if (!tokens || !tokens.accessToken) {
    console.log(JSON.stringify({
      authenticated: false,
      message: 'Not authenticated. Run: node auth.mjs setup',
    }, null, 2));
    return;
  }

  const expired = isTokenExpired(tokens);
  const expiresIn = expired ? 0 : Math.floor((tokens.expiresAt - Date.now()) / 1000);
  
  console.log(JSON.stringify({
    authenticated: true,
    expired,
    expiresAt: new Date(tokens.expiresAt).toISOString(),
    expiresIn: `${expiresIn} seconds`,
    tokenPath: TOKEN_PATH,
  }, null, 2));
}

async function setup() {
  const config = await loadConfig();
  const { url, state } = getAuthorizationUrl(config);
  
  console.log('TickTick OAuth Setup');
  console.log('');
  console.log('1. Open this URL in your browser:');
  console.log('');
  console.log(url);
  console.log('');
  console.log('2. Authorize the application');
  console.log('');
  console.log('3. After redirect, copy the "code" parameter from the URL');
  console.log('   Example: http://localhost:8080/callback?code=XXXXX&state=...');
  console.log('');
  console.log('4. Run: node auth.mjs exchange YOUR_CODE');
  console.log('');
  console.log(`State (for verification): ${state}`);
}

async function exchange(code) {
  const config = await loadConfig();
  const tokens = await exchangeCode(config, code);
  await saveTokens(tokens);
  
  console.log(JSON.stringify({
    success: true,
    message: 'Authentication successful!',
    expiresAt: new Date(tokens.expiresAt).toISOString(),
    tokenPath: TOKEN_PATH,
  }, null, 2));
}

async function refresh() {
  const config = await loadConfig();
  const tokens = await loadTokens();
  
  if (!tokens || !tokens.refreshToken) {
    throw new Error('No refresh token available. Run: node auth.mjs setup');
  }
  
  const newTokens = await refreshAccessToken(config, tokens.refreshToken);
  await saveTokens(newTokens);
  
  console.log(JSON.stringify({
    success: true,
    message: 'Token refreshed successfully!',
    expiresAt: new Date(newTokens.expiresAt).toISOString(),
  }, null, 2));
}

async function logout() {
  await clearTokens();
  console.log(JSON.stringify({
    success: true,
    message: 'Logged out. Tokens cleared.',
  }, null, 2));
}

main();
