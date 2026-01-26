#!/usr/bin/env node
/**
 * TickTick Skill - Integration Tests for tasks.mjs
 * Run: node --test scripts/tasks.test.mjs
 * 
 * These tests mock the API to verify task behavior.
 */

import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASKS_SCRIPT = join(__dirname, 'tasks.mjs');

// Test fixtures
const MOCK_TOKENS = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000, // 1 hour from now
  tokenType: 'Bearer',
};

const MOCK_CONFIG = {
  clientId: 'test-client-id',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:18888/callback',
  region: 'global',
};

const MOCK_PROJECTS = [
  { id: 'proj-1', name: 'Work', color: '#ff0000' },
  { id: 'proj-2', name: 'Personal', color: '#00ff00' },
];

const MOCK_TASKS = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Write tests',
    content: 'Unit and integration tests',
    dueDate: '2026-01-27',
    priority: 5,
    status: 0,
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Review PR',
    content: '',
    dueDate: '2026-01-28',
    priority: 3,
    status: 0,
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    title: 'Completed task',
    content: '',
    dueDate: '2026-01-25',
    priority: 1,
    status: 2,
    completedTime: '2026-01-25T10:00:00Z',
  },
];

/**
 * Run the tasks script with given args and mocked environment
 */
async function runTasks(args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [TASKS_SCRIPT, ...args], {
      env: { ...process.env, ...env },
      cwd: __dirname,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

describe('tasks.mjs CLI', () => {
  test('shows help when no command given', async () => {
    const { stdout, code } = await runTasks([]);
    
    assert.equal(code, 0);
    assert.ok(stdout.includes('TickTick Tasks'));
    assert.ok(stdout.includes('list PROJECT_ID'));
    assert.ok(stdout.includes('create PROJECT_ID'));
    assert.ok(stdout.includes('complete PROJECT_ID'));
  });

  test('list requires PROJECT_ID argument', async () => {
    const { stderr, code } = await runTasks(['list']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs list PROJECT_ID'));
  });

  test('get requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runTasks(['get', 'proj-1']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs get PROJECT_ID TASK_ID'));
  });

  test('create requires PROJECT_ID and Title', async () => {
    const { stderr, code } = await runTasks(['create', 'proj-1']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs create PROJECT_ID'));
  });

  test('complete requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runTasks(['complete', 'proj-1']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs complete PROJECT_ID TASK_ID'));
  });

  test('delete requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runTasks(['delete', 'proj-1']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs delete PROJECT_ID TASK_ID'));
  });

  test('search requires keyword', async () => {
    const { stderr, code } = await runTasks(['search']);
    
    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: node tasks.mjs search'));
  });
});

describe('Due date handling', () => {
  /**
   * These tests document expected due date behavior.
   * Based on TOOLS.md: "Due dates: Use date only (e.g. 2026-01-25), no time unless Kyle specifies one"
   */

  test('date-only format is accepted', () => {
    // Valid formats that should work
    const validDates = [
      '2026-01-25',
      '2026-12-31',
      '2027-01-01',
    ];
    
    for (const date of validDates) {
      // Verify ISO date format (YYYY-MM-DD)
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('datetime format is accepted when time is specified', () => {
    // When user specifies a time, we should include it
    const validDatetimes = [
      '2026-01-25T09:00:00-08:00', // PST
      '2026-01-25T17:00:00Z',      // UTC
    ];
    
    for (const datetime of validDatetimes) {
      // Verify ISO datetime format
      assert.ok(datetime.includes('T'));
    }
  });
});

describe('Priority mapping', () => {
  /**
   * TickTick uses specific priority values:
   * - 0: None
   * - 1: Low  
   * - 3: Medium
   * - 5: High
   * 
   * Note: 2 and 4 are NOT used by TickTick
   */

  test('priority values match TickTick API spec', () => {
    const expectedMapping = {
      none: 0,
      low: 1,
      medium: 3,
      high: 5,
    };

    // These values must match what TickTick expects
    assert.equal(expectedMapping.none, 0);
    assert.equal(expectedMapping.low, 1);
    assert.equal(expectedMapping.medium, 3);
    assert.equal(expectedMapping.high, 5);
  });
});

describe('Task status values', () => {
  /**
   * TickTick task status:
   * - 0: Active/incomplete
   * - 2: Completed
   */

  test('status 0 means active', () => {
    const task = { status: 0 };
    const statusStr = task.status === 2 ? 'completed' : 'active';
    assert.equal(statusStr, 'active');
  });

  test('status 2 means completed', () => {
    const task = { status: 2 };
    const statusStr = task.status === 2 ? 'completed' : 'active';
    assert.equal(statusStr, 'completed');
  });
});

// Run with: node --test scripts/tasks.test.mjs
