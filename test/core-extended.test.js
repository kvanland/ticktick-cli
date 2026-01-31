#!/usr/bin/env node
/**
 * TickTick CLI - Extended Unit Tests for lib/core.js
 * Tests for functions NOT covered in core.test.js
 * Run: node --test test/core-extended.test.js
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We need to mock the CONFIG_DIR before importing core.js
// So we'll use dynamic imports after setting up the environment

describe('shortId', () => {
  let shortId;

  beforeEach(async () => {
    const core = await import('../lib/core.js');
    shortId = core.shortId;
  });

  test('returns first 8 characters of a long ID', () => {
    assert.equal(shortId('1234567890abcdef'), '12345678');
  });

  test('returns full ID if 8 characters or less', () => {
    assert.equal(shortId('12345678'), '12345678');
    assert.equal(shortId('1234567'), '1234567');
    assert.equal(shortId('abc'), 'abc');
  });

  test('returns empty string for null/undefined', () => {
    assert.equal(shortId(null), '');
    assert.equal(shortId(undefined), '');
  });

  test('returns empty string for empty string', () => {
    assert.equal(shortId(''), '');
  });
});

describe('isShortId', () => {
  let isShortId;

  beforeEach(async () => {
    const core = await import('../lib/core.js');
    isShortId = core.isShortId;
  });

  test('returns true for IDs 8 characters or less', () => {
    assert.equal(isShortId('12345678'), true);
    assert.equal(isShortId('1234567'), true);
    assert.equal(isShortId('abc'), true);
    assert.equal(isShortId('a'), true);
  });

  test('returns false for IDs longer than 8 characters', () => {
    assert.equal(isShortId('123456789'), false);
    assert.equal(isShortId('1234567890abcdef'), false);
  });

  test('returns falsy for null/undefined/empty', () => {
    assert.ok(!isShortId(null));
    assert.ok(!isShortId(undefined));
    assert.ok(!isShortId(''));
  });
});

describe('Config and Token File Operations', () => {
  let tempDir;
  let originalEnv;

  beforeEach(async () => {
    // Create a temp directory for config files
    tempDir = await mkdtemp(join(tmpdir(), 'ticktick-test-'));

    // Save original env vars
    originalEnv = {
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      TICKTICK_CLIENT_ID: process.env.TICKTICK_CLIENT_ID,
      TICKTICK_CLIENT_SECRET: process.env.TICKTICK_CLIENT_SECRET,
      TICKTICK_REDIRECT_URI: process.env.TICKTICK_REDIRECT_URI,
      TICKTICK_REGION: process.env.TICKTICK_REGION,
    };

    // Clear env vars that might interfere
    delete process.env.TICKTICK_CLIENT_ID;
    delete process.env.TICKTICK_CLIENT_SECRET;
    delete process.env.TICKTICK_REDIRECT_URI;
    delete process.env.TICKTICK_REGION;

    // Set XDG_CONFIG_HOME to our temp directory
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(async () => {
    // Restore original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Clean up temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    test('loads config from environment variables', async () => {
      process.env.TICKTICK_CLIENT_ID = 'env-client-id';
      process.env.TICKTICK_CLIENT_SECRET = 'env-client-secret';
      process.env.TICKTICK_REDIRECT_URI = 'http://custom:9999/cb';
      process.env.TICKTICK_REGION = 'china';

      // Need fresh import to pick up new CONFIG_DIR
      const configDir = join(tempDir, 'ticktick');
      const configPath = join(configDir, 'config.json');

      // Import the module fresh
      const core = await import(`../lib/core.js?t=${Date.now()}`);
      const config = await core.loadConfig();

      assert.deepEqual(config, {
        clientId: 'env-client-id',
        clientSecret: 'env-client-secret',
        redirectUri: 'http://custom:9999/cb',
        region: 'china',
      });
    });

    test('uses default redirectUri and region when not in env', async () => {
      process.env.TICKTICK_CLIENT_ID = 'env-client-id';
      process.env.TICKTICK_CLIENT_SECRET = 'env-client-secret';

      const core = await import(`../lib/core.js?t=${Date.now()}-defaults`);
      const config = await core.loadConfig();

      assert.equal(config.redirectUri, 'http://localhost:18888/callback');
      assert.equal(config.region, 'global');
    });

    test('loads config from file when env vars not set', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const configData = {
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
        redirectUri: 'http://file:8080/callback',
        region: 'global',
      };

      await writeFile(
        join(configDir, 'config.json'),
        JSON.stringify(configData)
      );

      const core = await import(`../lib/core.js?t=${Date.now()}-file`);
      const config = await core.loadConfig();

      assert.deepEqual(config, configData);
    });

    test('throws error when no config found', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-noconfig`);

      await assert.rejects(
        () => core.loadConfig(),
        /No config found/
      );
    });

    test('throws error for invalid JSON in config file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'config.json'), 'not valid json {{{');

      const core = await import(`../lib/core.js?t=${Date.now()}-invalidjson`);

      await assert.rejects(
        () => core.loadConfig(),
        /Invalid config file/
      );
    });
  });

  describe('saveConfig', () => {
    test('saves config to file', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-save`);

      const configData = {
        clientId: 'save-test-id',
        clientSecret: 'save-test-secret',
        redirectUri: 'http://localhost:8080/callback',
        region: 'global',
      };

      await core.saveConfig(configData);

      const configPath = join(tempDir, 'ticktick', 'config.json');
      assert.ok(existsSync(configPath));

      const savedContent = await readFile(configPath, 'utf-8');
      const savedConfig = JSON.parse(savedContent);
      assert.deepEqual(savedConfig, configData);
    });

    test('creates config directory if it does not exist', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-savedir`);

      const configDir = join(tempDir, 'ticktick');
      assert.ok(!existsSync(configDir));

      await core.saveConfig({ clientId: 'test', clientSecret: 'test' });

      assert.ok(existsSync(configDir));
    });
  });

  describe('hasConfig', () => {
    test('returns true when env vars are set', async () => {
      process.env.TICKTICK_CLIENT_ID = 'has-config-id';
      process.env.TICKTICK_CLIENT_SECRET = 'has-config-secret';

      const core = await import(`../lib/core.js?t=${Date.now()}-hasenv`);

      assert.equal(core.hasConfig(), true);
    });

    test('returns true when config file exists', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'config.json'), '{}');

      const core = await import(`../lib/core.js?t=${Date.now()}-hasfile`);

      assert.equal(core.hasConfig(), true);
    });

    test('returns false when no config exists', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-nohas`);

      assert.equal(core.hasConfig(), false);
    });
  });

  describe('loadTokens', () => {
    test('returns null when token file does not exist', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-notokens`);

      const tokens = await core.loadTokens();
      assert.equal(tokens, null);
    });

    test('returns null for empty token file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'tokens.json'), '');

      const core = await import(`../lib/core.js?t=${Date.now()}-emptytokens`);

      const tokens = await core.loadTokens();
      assert.equal(tokens, null);
    });

    test('returns null for whitespace-only token file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'tokens.json'), '   \n  ');

      const core = await import(`../lib/core.js?t=${Date.now()}-whitespace`);

      const tokens = await core.loadTokens();
      assert.equal(tokens, null);
    });

    test('returns null for corrupted token file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'tokens.json'), 'corrupted {not json}');

      const core = await import(`../lib/core.js?t=${Date.now()}-corrupted`);

      const tokens = await core.loadTokens();
      assert.equal(tokens, null);
    });

    test('loads valid tokens from file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      const core = await import(`../lib/core.js?t=${Date.now()}-validtokens`);

      const tokens = await core.loadTokens();
      assert.deepEqual(tokens, tokenData);
    });
  });

  describe('saveTokens', () => {
    test('saves tokens to file', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-savetokens`);

      const tokenData = {
        accessToken: 'save-access-token',
        refreshToken: 'save-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };

      await core.saveTokens(tokenData);

      const tokenPath = join(tempDir, 'ticktick', 'tokens.json');
      assert.ok(existsSync(tokenPath));

      const savedContent = await readFile(tokenPath, 'utf-8');
      const savedTokens = JSON.parse(savedContent);
      assert.deepEqual(savedTokens, tokenData);
    });
  });

  describe('clearTokens', () => {
    test('clears existing token file', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenPath = join(configDir, 'tokens.json');
      await writeFile(tokenPath, JSON.stringify({ accessToken: 'to-clear' }));

      const core = await import(`../lib/core.js?t=${Date.now()}-cleartokens`);

      await core.clearTokens();

      const content = await readFile(tokenPath, 'utf-8');
      assert.equal(content, '');
    });

    test('does nothing when token file does not exist', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-clearnothing`);

      // Should not throw
      await core.clearTokens();

      const tokenPath = join(tempDir, 'ticktick', 'tokens.json');
      assert.ok(!existsSync(tokenPath));
    });
  });
});

describe('OAuth and API Functions (with fetch mocks)', () => {
  let originalFetch;
  let tempDir;
  let originalEnv;

  beforeEach(async () => {
    // Save original fetch
    originalFetch = global.fetch;

    // Create a temp directory for config files
    tempDir = await mkdtemp(join(tmpdir(), 'ticktick-fetch-test-'));

    // Save original env vars
    originalEnv = {
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      TICKTICK_CLIENT_ID: process.env.TICKTICK_CLIENT_ID,
      TICKTICK_CLIENT_SECRET: process.env.TICKTICK_CLIENT_SECRET,
      TICKTICK_REDIRECT_URI: process.env.TICKTICK_REDIRECT_URI,
      TICKTICK_REGION: process.env.TICKTICK_REGION,
    };

    // Set up test environment
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.TICKTICK_CLIENT_ID = 'test-client-id';
    process.env.TICKTICK_CLIENT_SECRET = 'test-client-secret';
    process.env.TICKTICK_REGION = 'global';
  });

  afterEach(async () => {
    // Restore original fetch
    global.fetch = originalFetch;

    // Restore original env vars
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Clean up temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('exchangeCode', () => {
    test('exchanges code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = mock.fn(async (url, options) => ({
        ok: true,
        json: async () => mockResponse,
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-exchange`);

      const config = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:8080/callback',
        region: 'global',
      };

      const beforeTime = Date.now();
      const tokens = await core.exchangeCode(config, 'auth-code-123');
      const afterTime = Date.now();

      assert.equal(tokens.accessToken, 'new-access-token');
      assert.equal(tokens.refreshToken, 'new-refresh-token');
      assert.equal(tokens.tokenType, 'Bearer');
      assert.ok(tokens.expiresAt >= beforeTime + 3600000);
      assert.ok(tokens.expiresAt <= afterTime + 3600000);
      assert.ok(tokens.storedAt >= beforeTime);
      assert.ok(tokens.storedAt <= afterTime);

      // Verify fetch was called correctly
      assert.equal(global.fetch.mock.calls.length, 1);
      const [fetchUrl, fetchOptions] = global.fetch.mock.calls[0].arguments;
      assert.equal(fetchUrl, 'https://ticktick.com/oauth/token');
      assert.equal(fetchOptions.method, 'POST');
      assert.ok(fetchOptions.body.includes('grant_type=authorization_code'));
      assert.ok(fetchOptions.body.includes('code=auth-code-123'));
    });

    test('uses China region token URL', async () => {
      global.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-exchangechina`);

      const config = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:8080/callback',
        region: 'china',
      };

      await core.exchangeCode(config, 'code');

      const [fetchUrl] = global.fetch.mock.calls[0].arguments;
      assert.equal(fetchUrl, 'https://dida365.com/oauth/token');
    });

    test('throws error on failed token exchange', async () => {
      global.fetch = mock.fn(async () => ({
        ok: false,
        text: async () => 'Invalid authorization code',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-exchangefail`);

      const config = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:8080/callback',
        region: 'global',
      };

      await assert.rejects(
        () => core.exchangeCode(config, 'bad-code'),
        /Token exchange failed: Invalid authorization code/
      );
    });
  });

  describe('refreshAccessToken', () => {
    test('refreshes token successfully', async () => {
      const mockResponse = {
        access_token: 'refreshed-access-token',
        refresh_token: 'refreshed-refresh-token',
        expires_in: 7200,
        token_type: 'Bearer',
      };

      global.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => mockResponse,
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-refresh`);

      const config = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        region: 'global',
      };

      const beforeTime = Date.now();
      const tokens = await core.refreshAccessToken(config, 'old-refresh-token');
      const afterTime = Date.now();

      assert.equal(tokens.accessToken, 'refreshed-access-token');
      assert.equal(tokens.refreshToken, 'refreshed-refresh-token');
      assert.ok(tokens.expiresAt >= beforeTime + 7200000);
      assert.ok(tokens.expiresAt <= afterTime + 7200000);

      // Verify fetch was called with refresh_token grant
      const [, fetchOptions] = global.fetch.mock.calls[0].arguments;
      assert.ok(fetchOptions.body.includes('grant_type=refresh_token'));
      assert.ok(fetchOptions.body.includes('refresh_token=old-refresh-token'));
    });

    test('throws error on failed refresh', async () => {
      global.fetch = mock.fn(async () => ({
        ok: false,
        text: async () => 'Refresh token expired',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-refreshfail`);

      const config = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        region: 'global',
      };

      await assert.rejects(
        () => core.refreshAccessToken(config, 'expired-token'),
        /Token refresh failed: Refresh token expired/
      );
    });
  });

  describe('getValidAccessToken', () => {
    test('returns existing token if not expired', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(); // Should not be called

      const core = await import(`../lib/core.js?t=${Date.now()}-getvalid`);

      const token = await core.getValidAccessToken();

      assert.equal(token, 'valid-access-token');
      assert.equal(global.fetch.mock.calls.length, 0);
    });

    test('refreshes and returns new token if expired', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'expired-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Already expired
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(async () => ({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-getexpired`);

      const token = await core.getValidAccessToken();

      assert.equal(token, 'new-access-token');
      assert.equal(global.fetch.mock.calls.length, 1);

      // Verify new tokens were saved
      const savedTokens = JSON.parse(await readFile(join(configDir, 'tokens.json'), 'utf-8'));
      assert.equal(savedTokens.accessToken, 'new-access-token');
    });

    test('throws error when not authenticated', async () => {
      const core = await import(`../lib/core.js?t=${Date.now()}-notauth`);

      await assert.rejects(
        () => core.getValidAccessToken(),
        /Not authenticated/
      );
    });
  });

  describe('apiRequest', () => {
    test('makes GET request successfully', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      const mockData = { id: 'task-123', title: 'Test Task' };
      global.fetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockData),
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-apiget`);

      const result = await core.apiRequest('GET', '/task/task-123');

      assert.deepEqual(result, mockData);

      const [fetchUrl, fetchOptions] = global.fetch.mock.calls[0].arguments;
      assert.equal(fetchUrl, 'https://api.ticktick.com/open/v1/task/task-123');
      assert.equal(fetchOptions.method, 'GET');
      assert.equal(fetchOptions.headers.Authorization, 'Bearer api-access-token');
      assert.equal(fetchOptions.headers.Accept, 'application/json');
      assert.equal(fetchOptions.body, undefined);
    });

    test('makes POST request with body', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      const mockResponse = { id: 'new-task-id', title: 'New Task' };
      global.fetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-apipost`);

      const body = { title: 'New Task', projectId: 'project-123' };
      const result = await core.apiRequest('POST', '/task', body);

      assert.deepEqual(result, mockResponse);

      const [, fetchOptions] = global.fetch.mock.calls[0].arguments;
      assert.equal(fetchOptions.method, 'POST');
      assert.equal(fetchOptions.headers['Content-Type'], 'application/json');
      assert.equal(fetchOptions.body, JSON.stringify(body));
    });

    test('handles 204 No Content response', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(async () => ({
        ok: true,
        status: 204,
        text: async () => '',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-api204`);

      const result = await core.apiRequest('DELETE', '/task/task-123');

      assert.equal(result, undefined);
    });

    test('handles empty response body', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-apiempty`);

      const result = await core.apiRequest('GET', '/some-endpoint');

      assert.equal(result, undefined);
    });

    test('throws error on API failure', async () => {
      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(async () => ({
        ok: false,
        status: 404,
        text: async () => 'Task not found',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-apifail`);

      await assert.rejects(
        () => core.apiRequest('GET', '/task/nonexistent'),
        /API request failed \(404\): Task not found/
      );
    });

    test('uses China API URL when region is china', async () => {
      // Set region to china
      process.env.TICKTICK_REGION = 'china';

      const configDir = join(tempDir, 'ticktick');
      await mkdir(configDir, { recursive: true });

      const tokenData = {
        accessToken: 'api-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      };
      await writeFile(join(configDir, 'tokens.json'), JSON.stringify(tokenData));

      global.fetch = mock.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => '{}',
      }));

      const core = await import(`../lib/core.js?t=${Date.now()}-apichina`);

      await core.apiRequest('GET', '/task/123');

      const [fetchUrl] = global.fetch.mock.calls[0].arguments;
      assert.equal(fetchUrl, 'https://api.dida365.com/open/v1/task/123');
    });
  });
});
