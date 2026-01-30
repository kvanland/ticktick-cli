/**
 * TickTick CLI - Interactive setup wizard
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  saveConfig,
  hasConfig,
  loadConfig,
  getAuthorizationUrl,
  exchangeCode,
  saveTokens,
  loadTokens,
  CONFIG_PATH,
  TOKEN_PATH,
} from './core.js';

/**
 * Run the interactive setup wizard
 */
export async function runSetup() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\n=== TickTick CLI Setup ===\n');

    // Check if already configured
    if (hasConfig()) {
      const config = await loadConfig();
      const tokens = await loadTokens();

      console.log('Existing configuration found:');
      console.log(`  Config: ${CONFIG_PATH}`);
      console.log(`  Client ID: ${config.clientId.slice(0, 8)}...`);
      if (tokens?.accessToken) {
        console.log(`  Status: Authenticated`);
      } else {
        console.log(`  Status: Not authenticated`);
      }
      console.log('');

      const reconfigure = await rl.question('Reconfigure? (y/N): ');
      if (reconfigure.toLowerCase() !== 'y') {
        if (!tokens?.accessToken) {
          console.log('\nRunning authentication flow...\n');
          await runAuthFlow(rl, config);
        } else {
          console.log('\nSetup complete! You are already authenticated.');
        }
        return { success: true, message: 'Setup complete' };
      }
      console.log('');
    }

    // Step 1: Get API credentials
    console.log('Step 1: Get API Credentials\n');
    console.log('  1. Go to https://developer.ticktick.com/');
    console.log('  2. Sign in and click "Manage Apps"');
    console.log('  3. Click "+App Name" to create a new app');
    console.log('  4. Set Redirect URI to: http://localhost:18888/callback');
    console.log('  5. Copy your Client ID and Client Secret\n');

    const clientId = await rl.question('Client ID: ');
    if (!clientId.trim()) {
      throw new Error('Client ID is required');
    }

    const clientSecret = await rl.question('Client Secret: ');
    if (!clientSecret.trim()) {
      throw new Error('Client Secret is required');
    }

    // Region selection
    console.log('\nRegion:');
    console.log('  1. Global (ticktick.com)');
    console.log('  2. China (dida365.com)');
    const regionChoice = await rl.question('Select region (1/2) [1]: ') || '1';
    const region = regionChoice === '2' ? 'china' : 'global';

    // Save config
    const config = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: 'http://localhost:18888/callback',
      region,
    };

    await saveConfig(config);
    console.log(`\nConfiguration saved to ${CONFIG_PATH}`);

    // Step 2: Authenticate
    console.log('\nStep 2: Authenticate\n');
    await runAuthFlow(rl, config);

    return { success: true, message: 'Setup complete!' };
  } finally {
    rl.close();
  }
}

/**
 * Run the OAuth authentication flow
 */
async function runAuthFlow(rl, config) {
  const { url } = getAuthorizationUrl(config);

  console.log('Open this URL in your browser to authorize:\n');
  console.log(`  ${url}\n`);
  console.log('After authorizing, you will be redirected to a URL like:');
  console.log('  http://localhost:18888/callback?code=XXXXXX&state=...\n');

  const codeInput = await rl.question('Paste the "code" value from the URL: ');
  const code = codeInput.trim();

  if (!code) {
    throw new Error('Authorization code is required');
  }

  console.log('\nExchanging code for tokens...');
  const tokens = await exchangeCode(config, code);
  await saveTokens(tokens);

  console.log('\nAuthentication successful!');
  console.log(`Tokens saved to ${TOKEN_PATH}`);
  console.log('\nYou can now use ticktick-cli. Try: ticktick tasks due');
}
