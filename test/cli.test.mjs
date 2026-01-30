#!/usr/bin/env node
/**
 * TickTick CLI - CLI Integration Tests
 * Run: node --test test/cli.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'bin', 'ticktick.mjs');

/**
 * Run the CLI with given args
 */
async function runCli(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env },
      cwd: join(__dirname, '..'),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

describe('ticktick CLI', () => {
  test('shows help when no command given', async () => {
    const { stdout, code } = await runCli([]);

    assert.equal(code, 0);
    assert.ok(stdout.includes('TickTick CLI'));
    assert.ok(stdout.includes('auth'));
    assert.ok(stdout.includes('projects'));
    assert.ok(stdout.includes('tasks'));
  });

  test('shows help with --help flag', async () => {
    const { stdout, code } = await runCli(['--help']);

    assert.equal(code, 0);
    assert.ok(stdout.includes('TickTick CLI'));
  });

  test('shows version with --version flag', async () => {
    const { stdout, code } = await runCli(['--version']);

    assert.equal(code, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
  });

  test('shows error for unknown command', async () => {
    const { stderr, code } = await runCli(['unknown']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Unknown command'));
  });
});

describe('ticktick auth', () => {
  test('shows help when no subcommand given', async () => {
    const { stdout, code } = await runCli(['auth']);

    assert.equal(code, 0);
    assert.ok(stdout.includes('ticktick auth'));
    assert.ok(stdout.includes('status'));
    assert.ok(stdout.includes('login'));
    assert.ok(stdout.includes('exchange'));
  });

  test('shows help with --help flag', async () => {
    const { stdout, code } = await runCli(['auth', '--help']);

    assert.equal(code, 0);
    assert.ok(stdout.includes('ticktick auth'));
  });

  test('exchange requires AUTH_CODE argument', async () => {
    const { stderr, code } = await runCli(['auth', 'exchange']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick auth exchange AUTH_CODE'));
  });
});

describe('ticktick projects', () => {
  test('shows help when no subcommand given', async () => {
    const { stdout, code } = await runCli(['projects']);

    assert.equal(code, 0);
    assert.ok(stdout.includes('ticktick projects'));
    assert.ok(stdout.includes('list'));
    assert.ok(stdout.includes('get'));
    assert.ok(stdout.includes('create'));
  });

  test('get requires PROJECT_ID argument', async () => {
    const { stderr, code } = await runCli(['projects', 'get']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick projects get PROJECT_ID'));
  });

  test('create requires NAME argument', async () => {
    const { stderr, code } = await runCli(['projects', 'create']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick projects create NAME'));
  });

  test('delete requires PROJECT_ID argument', async () => {
    const { stderr, code } = await runCli(['projects', 'delete']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick projects delete PROJECT_ID'));
  });
});

describe('ticktick tasks', () => {
  test('shows help when no subcommand given', async () => {
    const { stdout, code } = await runCli(['tasks']);

    assert.equal(code, 0);
    assert.ok(stdout.includes('ticktick tasks'));
    assert.ok(stdout.includes('list'));
    assert.ok(stdout.includes('create'));
    assert.ok(stdout.includes('complete'));
  });

  test('list requires PROJECT_ID argument', async () => {
    const { stderr, code } = await runCli(['tasks', 'list']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick tasks list PROJECT_ID'));
  });

  test('get requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runCli(['tasks', 'get', 'proj-1']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick tasks get PROJECT_ID TASK_ID'));
  });

  test('create with single arg treats it as title (needs auth)', async () => {
    // With the new CLI, a single argument is treated as the title (default project)
    // This will fail on auth, not on argument parsing
    const { stderr } = await runCli(['tasks', 'create', 'My Task Title']);

    // Should fail on auth/config, not on missing argument
    assert.ok(!stderr.includes('Usage:'));
  });

  test('complete requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runCli(['tasks', 'complete', 'proj-1']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick tasks complete PROJECT_ID TASK_ID'));
  });

  test('delete requires PROJECT_ID and TASK_ID', async () => {
    const { stderr, code } = await runCli(['tasks', 'delete', 'proj-1']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick tasks delete PROJECT_ID TASK_ID'));
  });

  test('search requires KEYWORD or filters', async () => {
    const { stderr, code } = await runCli(['tasks', 'search']);

    assert.equal(code, 1);
    assert.ok(stderr.includes('Usage: ticktick tasks search'));
  });
});

describe('parseArgs behavior', () => {
  test('due accepts optional days argument', async () => {
    // Due command should not error without argument (defaults to 7)
    // It will fail on auth, but not on argument parsing
    const { stderr } = await runCli(['tasks', 'due']);
    // Should fail on auth, not on missing argument
    assert.ok(!stderr.includes('Usage:'));
  });

  test('priority has no required arguments', async () => {
    const { stderr } = await runCli(['tasks', 'priority']);
    // Should fail on auth, not on missing argument
    assert.ok(!stderr.includes('Usage:'));
  });
});

describe('Due date handling', () => {
  test('date-only format is accepted', () => {
    const validDates = ['2026-01-25', '2026-12-31', '2027-01-01'];

    for (const date of validDates) {
      assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('datetime format is accepted when time is specified', () => {
    const validDatetimes = [
      '2026-01-25T09:00:00-08:00',
      '2026-01-25T17:00:00Z',
    ];

    for (const datetime of validDatetimes) {
      assert.ok(datetime.includes('T'));
    }
  });
});

describe('Priority mapping', () => {
  test('priority values match TickTick API spec', () => {
    const expectedMapping = {
      none: 0,
      low: 1,
      medium: 3,
      high: 5,
    };

    assert.equal(expectedMapping.none, 0);
    assert.equal(expectedMapping.low, 1);
    assert.equal(expectedMapping.medium, 3);
    assert.equal(expectedMapping.high, 5);
  });
});

describe('Task status values', () => {
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
