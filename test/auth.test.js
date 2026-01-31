#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/auth.js
 * Tests authentication operations with mocked core module
 * Run: node --test test/auth.test.js
 */

import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let mockLoadConfig;
let mockLoadTokens;
let mockSaveTokens;
let mockClearTokens;
let mockIsTokenExpired;
let mockGetAuthorizationUrl;
let mockExchangeCode;
let mockRefreshAccessToken;

const auth = await import('../lib/auth.js');

describe('auth.status', () => {
  beforeEach(() => {
    // Reset mocks to default implementations
    mockLoadTokens = mock.fn();
    mockIsTokenExpired = mock.fn();
  });

  test('returns unauthenticated when no tokens exist', async () => {
    mockLoadTokens = mock.fn(() => null);
    const mockDeps = {
      loadTokens: mockLoadTokens,
      isTokenExpired: mock.fn(),
      TOKEN_PATH: '/mock/path',
    };

    const result = await auth.status(mockDeps);

    assert.equal(result.authenticated, false);
    assert.ok(result.message.includes('Not authenticated'));
    assert.ok(result.message.includes('ticktick auth login'));
  });

  test('returns unauthenticated when tokens have no accessToken', async () => {
    mockLoadTokens = mock.fn(() => ({ refreshToken: 'some-refresh-token' }));
    const mockDeps = {
      loadTokens: mockLoadTokens,
      isTokenExpired: mock.fn(),
      TOKEN_PATH: '/mock/path',
    };

    const result = await auth.status(mockDeps);

    assert.equal(result.authenticated, false);
    assert.ok(result.message.includes('Not authenticated'));
  });

  test('returns authenticated with valid non-expired token', async () => {
    const expiresAt = Date.now() + 3600000; // 1 hour from now
    mockLoadTokens = mock.fn(() => ({
      accessToken: 'valid-token',
      expiresAt,
    }));
    mockIsTokenExpired = mock.fn(() => false);
    const mockDeps = {
      loadTokens: mockLoadTokens,
      isTokenExpired: mockIsTokenExpired,
      TOKEN_PATH: '/mock/path',
    };

    const result = await auth.status(mockDeps);

    assert.equal(result.authenticated, true);
    assert.equal(result.expired, false);
    assert.ok(result.expiresAt);
    assert.ok(result.expiresIn.includes('seconds'));
    assert.ok(result.tokenPath);
    // Verify expiresIn is positive
    const seconds = parseInt(result.expiresIn.split(' ')[0], 10);
    assert.ok(seconds > 0);
  });

  test('returns authenticated with expired flag when token is expired', async () => {
    const expiresAt = Date.now() - 1000; // Already expired
    mockLoadTokens = mock.fn(() => ({
      accessToken: 'expired-token',
      expiresAt,
    }));
    mockIsTokenExpired = mock.fn(() => true);
    const mockDeps = {
      loadTokens: mockLoadTokens,
      isTokenExpired: mockIsTokenExpired,
      TOKEN_PATH: '/mock/path',
    };

    const result = await auth.status(mockDeps);

    assert.equal(result.authenticated, true);
    assert.equal(result.expired, true);
    assert.equal(result.expiresIn, '0 seconds');
    assert.ok(result.tokenPath);
  });

  test('returns tokenPath from core module', async () => {
    mockLoadTokens = mock.fn(() => ({
      accessToken: 'test-token',
      expiresAt: Date.now() + 3600000,
    }));
    mockIsTokenExpired = mock.fn(() => false);
    const mockDeps = {
      loadTokens: mockLoadTokens,
      isTokenExpired: mockIsTokenExpired,
      TOKEN_PATH: '/mock/token/path',
    };

    const result = await auth.status(mockDeps);

    assert.equal(result.tokenPath, '/mock/token/path');
  });
});

describe('auth.login', () => {
  beforeEach(() => {
    mockLoadConfig = mock.fn();
    mockGetAuthorizationUrl = mock.fn();
  });

  test('returns authorization URL and state', async () => {
    const mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost:18888/callback',
      region: 'global',
    };
    mockLoadConfig = mock.fn(() => mockConfig);
    mockGetAuthorizationUrl = mock.fn(() => ({
      url: 'https://ticktick.com/oauth/authorize?client_id=test-client-id&state=abc123',
      state: 'abc123',
    }));
    const mockDeps = {
      loadConfig: mockLoadConfig,
      getAuthorizationUrl: mockGetAuthorizationUrl,
    };

    const result = await auth.login(mockDeps);

    assert.ok(result.message.includes('authorization URL'));
    assert.equal(result.url, 'https://ticktick.com/oauth/authorize?client_id=test-client-id&state=abc123');
    assert.equal(result.state, 'abc123');
    assert.ok(result.nextStep.includes('ticktick auth exchange'));
  });

  test('passes config to getAuthorizationUrl', async () => {
    const mockConfig = {
      clientId: 'my-client',
      clientSecret: 'my-secret',
      redirectUri: 'http://localhost:8080/cb',
      region: 'china',
    };
    mockLoadConfig = mock.fn(() => mockConfig);
    mockGetAuthorizationUrl = mock.fn((config) => {
      // Verify config is passed correctly
      assert.deepEqual(config, mockConfig);
      return { url: 'https://dida365.com/oauth/authorize', state: 'xyz789' };
    });
    const mockDeps = {
      loadConfig: mockLoadConfig,
      getAuthorizationUrl: mockGetAuthorizationUrl,
    };

    const result = await auth.login(mockDeps);

    assert.equal(mockGetAuthorizationUrl.mock.calls.length, 1);
    assert.equal(result.state, 'xyz789');
  });
});

describe('auth.exchange', () => {
  beforeEach(() => {
    mockLoadConfig = mock.fn();
    mockExchangeCode = mock.fn();
    mockSaveTokens = mock.fn();
  });

  test('exchanges code and saves tokens on success', async () => {
    const mockConfig = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      region: 'global',
    };
    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };
    mockLoadConfig = mock.fn(() => mockConfig);
    mockExchangeCode = mock.fn(() => mockTokens);
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      exchangeCode: mockExchangeCode,
      saveTokens: mockSaveTokens,
      TOKEN_PATH: '/mock/token/path',
    };

    const result = await auth.exchange('auth-code-123', mockDeps);

    assert.equal(result.success, true);
    assert.ok(result.message.includes('successful'));
    assert.ok(result.expiresAt);
    assert.equal(result.tokenPath, '/mock/token/path');

    // Verify exchangeCode was called with correct arguments
    assert.equal(mockExchangeCode.mock.calls.length, 1);
    assert.deepEqual(mockExchangeCode.mock.calls[0].arguments[0], mockConfig);
    assert.equal(mockExchangeCode.mock.calls[0].arguments[1], 'auth-code-123');

    // Verify tokens were saved
    assert.equal(mockSaveTokens.mock.calls.length, 1);
    assert.deepEqual(mockSaveTokens.mock.calls[0].arguments[0], mockTokens);
  });

  test('returns ISO formatted expiresAt', async () => {
    const expiresAt = Date.now() + 7200000; // 2 hours
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockExchangeCode = mock.fn(() => ({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt,
    }));
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      exchangeCode: mockExchangeCode,
      saveTokens: mockSaveTokens,
      TOKEN_PATH: '/mock/token/path',
    };

    const result = await auth.exchange('code', mockDeps);

    // Verify expiresAt is valid ISO string
    const parsedDate = new Date(result.expiresAt);
    assert.ok(!isNaN(parsedDate.getTime()));
    assert.equal(parsedDate.toISOString(), result.expiresAt);
  });

  test('propagates error from exchangeCode', async () => {
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockExchangeCode = mock.fn(() => {
      throw new Error('Token exchange failed: invalid_grant');
    });
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      exchangeCode: mockExchangeCode,
      saveTokens: mockSaveTokens,
      TOKEN_PATH: '/mock/token/path',
    };

    await assert.rejects(
      () => auth.exchange('invalid-code', mockDeps),
      { message: 'Token exchange failed: invalid_grant' }
    );

    // Verify saveTokens was not called
    assert.equal(mockSaveTokens.mock.calls.length, 0);
  });
});

describe('auth.refresh', () => {
  beforeEach(() => {
    mockLoadConfig = mock.fn();
    mockLoadTokens = mock.fn();
    mockRefreshAccessToken = mock.fn();
    mockSaveTokens = mock.fn();
  });

  test('throws error when no tokens exist', async () => {
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => null);
    mockRefreshAccessToken = mock.fn();
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      loadTokens: mockLoadTokens,
      refreshAccessToken: mockRefreshAccessToken,
      saveTokens: mockSaveTokens,
    };

    await assert.rejects(
      () => auth.refresh(mockDeps),
      { message: 'No refresh token available. Run: ticktick auth login' }
    );
  });

  test('throws error when tokens have no refreshToken', async () => {
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'token' }));
    mockRefreshAccessToken = mock.fn();
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      loadTokens: mockLoadTokens,
      refreshAccessToken: mockRefreshAccessToken,
      saveTokens: mockSaveTokens,
    };

    await assert.rejects(
      () => auth.refresh(mockDeps),
      { message: 'No refresh token available. Run: ticktick auth login' }
    );
  });

  test('refreshes and saves new tokens on success', async () => {
    const mockConfig = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      region: 'global',
    };
    const existingTokens = {
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      expiresAt: Date.now() - 1000, // expired
    };
    const newTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    };
    mockLoadConfig = mock.fn(() => mockConfig);
    mockLoadTokens = mock.fn(() => existingTokens);
    mockRefreshAccessToken = mock.fn(() => newTokens);
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      loadTokens: mockLoadTokens,
      refreshAccessToken: mockRefreshAccessToken,
      saveTokens: mockSaveTokens,
    };

    const result = await auth.refresh(mockDeps);

    assert.equal(result.success, true);
    assert.ok(result.message.includes('refreshed'));
    assert.ok(result.expiresAt);

    // Verify refreshAccessToken was called with correct arguments
    assert.equal(mockRefreshAccessToken.mock.calls.length, 1);
    assert.deepEqual(mockRefreshAccessToken.mock.calls[0].arguments[0], mockConfig);
    assert.equal(mockRefreshAccessToken.mock.calls[0].arguments[1], 'old-refresh-token');

    // Verify new tokens were saved
    assert.equal(mockSaveTokens.mock.calls.length, 1);
    assert.deepEqual(mockSaveTokens.mock.calls[0].arguments[0], newTokens);
  });

  test('returns ISO formatted expiresAt', async () => {
    const expiresAt = Date.now() + 3600000;
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ refreshToken: 'refresh-token' }));
    mockRefreshAccessToken = mock.fn(() => ({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
      expiresAt,
    }));
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      loadTokens: mockLoadTokens,
      refreshAccessToken: mockRefreshAccessToken,
      saveTokens: mockSaveTokens,
    };

    const result = await auth.refresh(mockDeps);

    const parsedDate = new Date(result.expiresAt);
    assert.ok(!isNaN(parsedDate.getTime()));
    assert.equal(parsedDate.toISOString(), result.expiresAt);
  });

  test('propagates error from refreshAccessToken', async () => {
    mockLoadConfig = mock.fn(() => ({ clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ refreshToken: 'invalid-refresh' }));
    mockRefreshAccessToken = mock.fn(() => {
      throw new Error('Token refresh failed: invalid_grant');
    });
    mockSaveTokens = mock.fn();
    const mockDeps = {
      loadConfig: mockLoadConfig,
      loadTokens: mockLoadTokens,
      refreshAccessToken: mockRefreshAccessToken,
      saveTokens: mockSaveTokens,
    };

    await assert.rejects(
      () => auth.refresh(mockDeps),
      { message: 'Token refresh failed: invalid_grant' }
    );

    // Verify saveTokens was not called
    assert.equal(mockSaveTokens.mock.calls.length, 0);
  });
});

describe('auth.logout', () => {
  beforeEach(() => {
    mockClearTokens = mock.fn();
  });

  test('clears tokens and returns success', async () => {
    mockClearTokens = mock.fn();
    const mockDeps = {
      clearTokens: mockClearTokens,
    };

    const result = await auth.logout(mockDeps);

    assert.equal(result.success, true);
    assert.ok(result.message.includes('Logged out'));
    assert.ok(result.message.includes('cleared'));

    // Verify clearTokens was called
    assert.equal(mockClearTokens.mock.calls.length, 1);
  });

  test('does not throw even if clearTokens has no tokens to clear', async () => {
    mockClearTokens = mock.fn();
    const mockDeps = {
      clearTokens: mockClearTokens,
    };

    // Should not throw
    const result = await auth.logout(mockDeps);

    assert.equal(result.success, true);
  });

  test('propagates error from clearTokens', async () => {
    mockClearTokens = mock.fn(() => {
      throw new Error('Permission denied');
    });
    const mockDeps = {
      clearTokens: mockClearTokens,
    };

    await assert.rejects(
      () => auth.logout(mockDeps),
      { message: 'Permission denied' }
    );
  });
});
