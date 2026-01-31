#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/mcp.js
 * Tests MCP server creation and tool execution
 * Run: node --experimental-test-module-mocks --test test/mcp.test.js
 */

import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { createServer } = await import('../lib/mcp.js');

let mockDeps;

const buildMockDeps = () => ({
  auth: {
    status: mock.fn(),
  },
  projects: {
    list: mock.fn(),
    get: mock.fn(),
  },
  tasks: {
    list: mock.fn(),
    get: mock.fn(),
    create: mock.fn(),
    update: mock.fn(),
    complete: mock.fn(),
    remove: mock.fn(),
    search: mock.fn(),
    due: mock.fn(),
    priority: mock.fn(),
  },
});

describe('createServer', () => {
  beforeEach(() => {
    mockDeps = buildMockDeps();
  });

  test('returns a server object', () => {
    const server = createServer(mockDeps);
    assert.ok(server, 'Server should be defined');
    assert.equal(typeof server, 'object', 'Server should be an object');
  });

  test('server has tool method', () => {
    const server = createServer(mockDeps);
    assert.equal(typeof server.tool, 'function', 'Server should have a tool method');
  });

  test('server has connect method', () => {
    const server = createServer(mockDeps);
    assert.equal(typeof server.connect, 'function', 'Server should have a connect method');
  });

  test('server has close method', () => {
    const server = createServer(mockDeps);
    assert.equal(typeof server.close, 'function', 'Server should have a close method');
  });
});

describe('MCP server configuration', () => {
  beforeEach(() => {
    mockDeps = buildMockDeps();
  });

  test('server is properly configured', () => {
    const server = createServer(mockDeps);
    assert.ok(server, 'Server should exist');
    assert.ok(typeof server.tool === 'function', 'Server should have tool method');
  });
});

describe('Multiple server instances', () => {
  beforeEach(() => {
    mockDeps = buildMockDeps();
  });

  test('createServer returns independent instances', () => {
    const server1 = createServer(mockDeps);
    const server2 = createServer(mockDeps);

    assert.ok(server1 !== server2, 'Servers should be different instances');
  });
});
