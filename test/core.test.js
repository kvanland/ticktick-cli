#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/core.js
 * Run: node --test test/core.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReminder,
  parsePriority,
  formatPriority,
  isTokenExpired,
  getAuthorizationUrl,
  Priority,
} from '../lib/core.js';

describe('parseReminder', () => {
  test('parses minutes correctly', () => {
    assert.equal(parseReminder('15m'), 'TRIGGER:-PT15M');
    assert.equal(parseReminder('1m'), 'TRIGGER:-PT1M');
    assert.equal(parseReminder('60m'), 'TRIGGER:-PT60M');
  });

  test('parses hours correctly', () => {
    assert.equal(parseReminder('1h'), 'TRIGGER:-PT1H');
    assert.equal(parseReminder('24h'), 'TRIGGER:-PT24H');
  });

  test('parses days correctly', () => {
    assert.equal(parseReminder('1d'), 'TRIGGER:-P1D');
    assert.equal(parseReminder('7d'), 'TRIGGER:-P7D');
  });

  test('returns null for null/undefined/empty input', () => {
    assert.equal(parseReminder(null), null);
    assert.equal(parseReminder(undefined), null);
    assert.equal(parseReminder(''), null);
  });

  test('throws error for invalid reminder format', () => {
    assert.throws(
      () => parseReminder('15'),
      { message: 'Invalid reminder "15". Use format like: 15m, 1h, 1d' }
    );
    assert.throws(
      () => parseReminder('m15'),
      /Invalid reminder "m15"/
    );
    assert.throws(
      () => parseReminder('15x'),
      /Invalid reminder "15x"/
    );
    assert.throws(
      () => parseReminder('abc'),
      /Invalid reminder "abc"/
    );
    assert.throws(
      () => parseReminder('15min'),
      /Invalid reminder "15min"/
    );
  });
});

describe('parsePriority', () => {
  test('parses valid priorities (case-insensitive)', () => {
    assert.equal(parsePriority('none'), Priority.None);
    assert.equal(parsePriority('None'), Priority.None);
    assert.equal(parsePriority('NONE'), Priority.None);

    assert.equal(parsePriority('low'), Priority.Low);
    assert.equal(parsePriority('Low'), Priority.Low);

    assert.equal(parsePriority('medium'), Priority.Medium);
    assert.equal(parsePriority('Medium'), Priority.Medium);

    assert.equal(parsePriority('high'), Priority.High);
    assert.equal(parsePriority('HIGH'), Priority.High);
  });

  test('returns undefined for null/undefined/empty input', () => {
    assert.equal(parsePriority(null), undefined);
    assert.equal(parsePriority(undefined), undefined);
    assert.equal(parsePriority(''), undefined);
  });

  test('throws error for invalid priority strings', () => {
    assert.throws(
      () => parsePriority('urgent'),
      { message: 'Invalid priority "urgent". Valid options: none, low, medium, high' }
    );
    assert.throws(
      () => parsePriority('1'),
      { message: 'Invalid priority "1". Valid options: none, low, medium, high' }
    );
    assert.throws(
      () => parsePriority('critical'),
      /Invalid priority "critical"/
    );
  });
});

describe('formatPriority', () => {
  test('formats priority numbers to strings', () => {
    assert.equal(formatPriority(Priority.None), 'none');
    assert.equal(formatPriority(Priority.Low), 'low');
    assert.equal(formatPriority(Priority.Medium), 'medium');
    assert.equal(formatPriority(Priority.High), 'high');
  });

  test('returns none for unknown values', () => {
    // NOTE: Unknown priority values silently become 'none'.
    // If TickTick API returns priority=2 or 4, we lose that information.
    // Consider: Return 'unknown(2)' or log a warning for debugging.
    assert.equal(formatPriority(2), 'none');
    assert.equal(formatPriority(4), 'none');
    assert.equal(formatPriority(99), 'none');
    assert.equal(formatPriority(undefined), 'none');
    assert.equal(formatPriority(null), 'none');
  });
});

describe('Priority enum', () => {
  test('has correct values matching TickTick API', () => {
    assert.equal(Priority.None, 0);
    assert.equal(Priority.Low, 1);
    assert.equal(Priority.Medium, 3);
    assert.equal(Priority.High, 5);
  });
});

describe('isTokenExpired', () => {
  test('returns true when token is expired', () => {
    const tokens = { expiresAt: Date.now() - 1000 };
    assert.equal(isTokenExpired(tokens), true);
  });

  test('returns true within 60s buffer', () => {
    const tokens = { expiresAt: Date.now() + 30000 }; // 30s from now
    assert.equal(isTokenExpired(tokens), true);
  });

  test('returns false when token is valid', () => {
    const tokens = { expiresAt: Date.now() + 120000 }; // 2 min from now
    assert.equal(isTokenExpired(tokens), false);
  });

  test('returns false at exactly 60s boundary', () => {
    const tokens = { expiresAt: Date.now() + 60001 }; // just over 60s
    assert.equal(isTokenExpired(tokens), false);
  });
});

describe('getAuthorizationUrl', () => {
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost:18888/callback',
    region: 'global',
  };

  test('generates valid global authorization URL', () => {
    const { url, state } = getAuthorizationUrl(config);

    assert.ok(url.startsWith('https://ticktick.com/oauth/authorize?'));
    assert.ok(url.includes('client_id=test-client-id'));
    assert.ok(url.includes('redirect_uri=http%3A%2F%2Flocalhost%3A18888%2Fcallback'));
    assert.ok(url.includes('response_type=code'));
    assert.ok(url.includes('scope=tasks%3Aread+tasks%3Awrite'));
    assert.ok(url.includes(`state=${state}`));
    assert.ok(state.length > 0);
  });

  test('generates valid China region URL', () => {
    const chinaConfig = { ...config, region: 'china' };
    const { url } = getAuthorizationUrl(chinaConfig);

    assert.ok(url.startsWith('https://dida365.com/oauth/authorize?'));
  });

  test('defaults to global region', () => {
    const noRegionConfig = { ...config };
    delete noRegionConfig.region;
    const { url } = getAuthorizationUrl(noRegionConfig);

    assert.ok(url.startsWith('https://ticktick.com/oauth/authorize?'));
  });

  test('generates unique state each call', () => {
    const { state: state1 } = getAuthorizationUrl(config);
    const { state: state2 } = getAuthorizationUrl(config);

    assert.notEqual(state1, state2);
  });
});
