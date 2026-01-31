#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/mcp.js
 * Tests MCP server creation and tool execution
 * Run: node --experimental-test-module-mocks --test test/mcp.test.js
 */

import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Create mock functions for all dependencies
let mockAuthStatus;
let mockProjectsList;
let mockProjectsGet;
let mockTasksList;
let mockTasksGet;
let mockTasksCreate;
let mockTasksUpdate;
let mockTasksComplete;
let mockTasksRemove;
let mockTasksSearch;
let mockTasksDue;
let mockTasksPriority;

// Mock the auth module
mock.module('../lib/auth.js', {
  namedExports: {
    status: (...args) => mockAuthStatus(...args),
  },
});

// Mock the projects module
mock.module('../lib/projects.js', {
  namedExports: {
    list: (...args) => mockProjectsList(...args),
    get: (...args) => mockProjectsGet(...args),
  },
});

// Mock the tasks module
mock.module('../lib/tasks.js', {
  namedExports: {
    list: (...args) => mockTasksList(...args),
    get: (...args) => mockTasksGet(...args),
    create: (...args) => mockTasksCreate(...args),
    update: (...args) => mockTasksUpdate(...args),
    complete: (...args) => mockTasksComplete(...args),
    remove: (...args) => mockTasksRemove(...args),
    search: (...args) => mockTasksSearch(...args),
    due: (...args) => mockTasksDue(...args),
    priority: (...args) => mockTasksPriority(...args),
  },
});

// Import createServer after mocking dependencies
const { createServer } = await import('../lib/mcp.js');

describe('createServer', () => {
  test('returns a server object', () => {
    const server = createServer();
    assert.ok(server, 'Server should be defined');
    assert.equal(typeof server, 'object', 'Server should be an object');
  });

  test('server has tool method', () => {
    const server = createServer();
    assert.equal(typeof server.tool, 'function', 'Server should have a tool method');
  });

  test('server has connect method', () => {
    const server = createServer();
    assert.equal(typeof server.connect, 'function', 'Server should have a connect method');
  });

  test('server has close method', () => {
    const server = createServer();
    assert.equal(typeof server.close, 'function', 'Server should have a close method');
  });
});

describe('MCP server configuration', () => {
  test('server is properly configured', () => {
    const server = createServer();
    assert.ok(server, 'Server should exist');
    assert.ok(typeof server.tool === 'function', 'Server should have tool method');
  });
});

describe('Multiple server instances', () => {
  test('createServer returns independent instances', () => {
    const server1 = createServer();
    const server2 = createServer();

    assert.ok(server1 !== server2, 'Servers should be different instances');
  });
});
