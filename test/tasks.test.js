#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/tasks.js
 * Tests task operations with mocked API calls
 * Run: node --test test/tasks.test.js
 */

import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// We need to mock the core module before importing tasks
// Create mock functions that will be controlled in tests
let mockApiRequest;
let mockLoadConfig;
let mockLoadTokens;
let mockSaveTokens;

// Store the original module
const originalCore = await import('../lib/core.js');

// Create a mock module cache
const mockCore = {
  ...originalCore,
  apiRequest: (...args) => mockApiRequest(...args),
  loadConfig: () => mockLoadConfig(),
  loadTokens: () => mockLoadTokens(),
  saveTokens: (tokens) => mockSaveTokens(tokens),
};

// Mock the core module
mock.module('../lib/core.js', {
  namedExports: mockCore,
});

// Now import tasks (it will use our mocked core)
const tasks = await import('../lib/tasks.js');

describe('tasks.list', () => {
  beforeEach(() => {
    // Reset mocks
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
    mockSaveTokens = mock.fn();
  });

  test('returns formatted tasks from project', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            {
              id: 'task123456789',
              title: 'Test Task',
              content: 'Task content',
              dueDate: '2026-01-30',
              priority: 5,
              tags: ['work'],
              status: 0,
            },
            {
              id: 'task987654321',
              title: 'Completed Task',
              content: '',
              priority: 0,
              tags: [],
              status: 2,
              completedTime: '2026-01-29T10:00:00Z',
            },
          ],
        };
      }
      return {};
    });

    const result = await tasks.list('proj1234');

    assert.equal(result.length, 2);
    assert.equal(result[0].id, 'task1234');
    assert.equal(result[0].fullId, 'task123456789');
    assert.equal(result[0].title, 'Test Task');
    assert.equal(result[0].priority, 'high');
    assert.equal(result[0].status, 'active');
    assert.deepEqual(result[0].tags, ['work']);

    assert.equal(result[1].status, 'completed');
    assert.equal(result[1].priority, 'none');
  });

  test('handles empty project ID by looking up inbox', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'inbox123456789', name: 'Inbox' },
          { id: 'proj987654321', name: 'Work' },
        ];
      }
      if (path.includes('/project/inbox123456789/data')) {
        return { tasks: [{ id: 'task1', title: 'Inbox task', priority: 0, status: 0 }] };
      }
      return {};
    });

    const result = await tasks.list('');

    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Inbox task');
    // Verify it called the inbox project URL
    const dataCall = mockApiRequest.mock.calls.find(c => c.arguments[1].includes('/data'));
    assert.ok(dataCall.arguments[1].includes('inbox123456789'));
  });

  test('throws error when inbox not found and no project ID provided', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }]; // No inbox
      }
      return {};
    });

    await assert.rejects(
      () => tasks.list(''),
      { message: 'Could not find inbox project. Please specify a project ID.' }
    );
  });
});

describe('tasks.get', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('returns full task details', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [{ id: 'task123456789', title: 'Test' }],
        };
      }
      if (path.includes('/task/')) {
        return {
          id: 'task123456789',
          projectId: 'proj123456789',
          title: 'Test Task',
          content: 'Description here',
          dueDate: '2026-01-30',
          startDate: '2026-01-25',
          priority: 3,
          tags: ['urgent'],
          status: 0,
          reminders: ['TRIGGER:-PT15M'],
          repeatFlag: null,
          items: [],
          createdTime: '2026-01-01T00:00:00Z',
          modifiedTime: '2026-01-25T12:00:00Z',
        };
      }
      return {};
    });

    const result = await tasks.get('proj1234', 'task1234');

    assert.equal(result.id, 'task1234');
    assert.equal(result.fullId, 'task123456789');
    assert.equal(result.projectId, 'proj1234');
    assert.equal(result.fullProjectId, 'proj123456789');
    assert.equal(result.title, 'Test Task');
    assert.equal(result.content, 'Description here');
    assert.equal(result.priority, 'medium');
    assert.equal(result.status, 'active');
    assert.deepEqual(result.reminders, ['TRIGGER:-PT15M']);
  });
});

describe('tasks.create', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('creates task with minimal options', async () => {
    mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST' && path === '/task') {
        return {
          id: 'newtask123456',
          projectId: 'proj123456789',
          title: body.title,
          priority: 0,
          tags: [],
        };
      }
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      return {};
    });

    const result = await tasks.create('proj1234', 'New Task');

    assert.equal(result.success, true);
    assert.equal(result.task.title, 'New Task');
    assert.equal(result.task.id, 'newtask1');

    // Verify POST was called with correct body
    const postCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'POST');
    assert.equal(postCall.arguments[2].title, 'New Task');
    assert.equal(postCall.arguments[2].projectId, 'proj123456789');
  });

  test('creates task with all options', async () => {
    mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST' && path === '/task') {
        return {
          id: 'newtask123456',
          projectId: 'proj123456789',
          title: body.title,
          dueDate: body.dueDate,
          priority: body.priority,
          tags: body.tags,
        };
      }
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      return {};
    });

    const result = await tasks.create('proj1234', 'Important Task', {
      content: 'Task description',
      dueDate: '2026-02-01',
      priority: 'high',
      tags: ['urgent', 'work'],
      reminder: '1h',
    });

    assert.equal(result.success, true);

    const postCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'POST');
    const body = postCall.arguments[2];
    assert.equal(body.title, 'Important Task');
    assert.equal(body.content, 'Task description');
    assert.equal(body.dueDate, '2026-02-01');
    assert.equal(body.priority, 5); // high = 5
    assert.deepEqual(body.tags, ['urgent', 'work']);
    assert.deepEqual(body.reminders, ['TRIGGER:-PT1H']);
  });

  test('parses comma-separated tags string', async () => {
    mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST') {
        return { id: 'task123', projectId: 'proj123', title: body.title, tags: body.tags };
      }
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      return {};
    });

    await tasks.create('proj1234', 'Task', { tags: 'tag1, tag2, tag3' });

    const postCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'POST');
    assert.deepEqual(postCall.arguments[2].tags, ['tag1', 'tag2', 'tag3']);
  });
});

describe('tasks.update', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('updates task with provided options', async () => {
    mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST' && path.includes('/task/')) {
        return {
          id: body.id,
          projectId: 'proj123456789',
          title: body.title || 'Original',
          dueDate: body.dueDate,
          priority: body.priority || 0,
          tags: body.tags || [],
        };
      }
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return { tasks: [{ id: 'task123456789', title: 'Original' }] };
      }
      return {};
    });

    const result = await tasks.update('task1234', {
      title: 'Updated Title',
      priority: 'medium',
    });

    assert.equal(result.success, true);

    const postCall = mockApiRequest.mock.calls.find(c =>
      c.arguments[0] === 'POST' && c.arguments[1].includes('/task/')
    );
    assert.equal(postCall.arguments[2].title, 'Updated Title');
    assert.equal(postCall.arguments[2].priority, 3); // medium = 3
  });

  test('only includes provided fields in update', async () => {
    mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST' && path.includes('/task/')) {
        return { id: body.id, projectId: 'proj123', title: 'Task', priority: 0, tags: [] };
      }
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return { tasks: [{ id: 'task123456789' }] };
      }
      return {};
    });

    await tasks.update('task1234', { dueDate: '2026-03-01' });

    const postCall = mockApiRequest.mock.calls.find(c =>
      c.arguments[0] === 'POST' && c.arguments[1].includes('/task/')
    );
    const body = postCall.arguments[2];
    assert.equal(body.dueDate, '2026-03-01');
    assert.equal(body.title, undefined);
    assert.equal(body.priority, undefined);
  });
});

describe('tasks.complete', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('marks task as complete', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return { tasks: [{ id: 'task123456789' }] };
      }
      if (method === 'POST' && path.includes('/complete')) {
        return undefined; // 204 No Content
      }
      return {};
    });

    const result = await tasks.complete('proj1234', 'task1234');

    assert.equal(result.success, true);
    assert.ok(result.message.includes('task1234'));
    assert.ok(result.message.includes('completed'));

    const completeCall = mockApiRequest.mock.calls.find(c =>
      c.arguments[1].includes('/complete')
    );
    assert.ok(completeCall);
  });
});

describe('tasks.remove', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('deletes task', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return { tasks: [{ id: 'task123456789' }] };
      }
      if (method === 'DELETE') {
        return undefined;
      }
      return {};
    });

    const result = await tasks.remove('proj1234', 'task1234');

    assert.equal(result.success, true);
    assert.ok(result.message.includes('deleted'));

    const deleteCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'DELETE');
    assert.ok(deleteCall);
    assert.ok(deleteCall.arguments[1].includes('task123456789'));
  });
});

describe('tasks.search', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('searches tasks by keyword', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'proj1', name: 'Work' },
          { id: 'proj2', name: 'Personal' },
        ];
      }
      if (path.includes('proj1/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'Meeting notes', content: '', priority: 0, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Other task', content: '', priority: 0, status: 0 },
          ],
        };
      }
      if (path.includes('proj2/data')) {
        return {
          tasks: [
            { id: 'task3', projectId: 'proj2', title: 'Buy groceries', content: 'meeting supplies', priority: 0, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.search('meeting');

    assert.equal(result.keyword, 'meeting');
    assert.equal(result.count, 2);
    assert.equal(result.tasks.length, 2);

    // Should find 'meeting' in title and content
    const titles = result.tasks.map(t => t.title);
    assert.ok(titles.includes('Meeting notes'));
    assert.ok(titles.includes('Buy groceries')); // has 'meeting' in content
  });

  test('filters by tags', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'Task 1', tags: ['urgent'], priority: 0, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Task 2', tags: ['low'], priority: 0, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'Task 3', tags: ['urgent', 'work'], priority: 0, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.search('', { tags: ['urgent'] });

    assert.equal(result.count, 2);
    assert.ok(result.tasks.every(t => t.tags.includes('urgent')));
  });

  test('filters by priority', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'High priority', priority: 5, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Low priority', priority: 1, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'Another high', priority: 5, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.search('', { priority: 'high' });

    assert.equal(result.count, 2);
    assert.ok(result.tasks.every(t => t.priority === 'high'));
  });

  test('handles inaccessible projects gracefully', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'proj1', name: 'Work' },
          { id: 'proj2', name: 'Private' },
        ];
      }
      if (path.includes('proj1/data')) {
        return { tasks: [{ id: 'task1', projectId: 'proj1', title: 'Task', priority: 0, status: 0 }] };
      }
      if (path.includes('proj2/data')) {
        throw new Error('Access denied');
      }
      return {};
    });

    // Should not throw, should skip the inaccessible project
    const result = await tasks.search('');

    assert.equal(result.count, 1);
  });
});

describe('tasks.due', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('returns tasks due within specified days', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'Due tomorrow', dueDate: tomorrow.toISOString(), priority: 0, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Due next week', dueDate: nextWeek.toISOString(), priority: 0, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'Due next month', dueDate: nextMonth.toISOString(), priority: 0, status: 0 },
            { id: 'task4', projectId: 'proj1', title: 'No due date', priority: 0, status: 0 },
            { id: 'task5', projectId: 'proj1', title: 'Completed', dueDate: tomorrow.toISOString(), priority: 0, status: 2 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.due(7);

    assert.equal(result.days, 7);
    // Should include tomorrow and next week, but not next month, no due date, or completed
    assert.equal(result.count, 2);
  });

  test('sorts results by due date', async () => {
    const day1 = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const day2 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'Day 3', dueDate: day3.toISOString(), priority: 0, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Day 1', dueDate: day1.toISOString(), priority: 0, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'Day 2', dueDate: day2.toISOString(), priority: 0, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.due(7);

    assert.equal(result.tasks[0].title, 'Day 1');
    assert.equal(result.tasks[1].title, 'Day 2');
    assert.equal(result.tasks[2].title, 'Day 3');
  });

  test('defaults to 7 days', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [];
      }
      return {};
    });

    const result = await tasks.due();

    assert.equal(result.days, 7);
  });

  test('includes overdue tasks (dueDate in past)', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'Overdue task', dueDate: yesterday.toISOString(), priority: 5, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Due tomorrow', dueDate: tomorrow.toISOString(), priority: 0, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.due(7);

    // Overdue tasks should be included - they're the most urgent
    assert.equal(result.count, 2);
    // Sorted by due date, so overdue comes first
    assert.equal(result.tasks[0].title, 'Overdue task');
    assert.equal(result.tasks[1].title, 'Due tomorrow');
  });
});

describe('tasks.priority', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('returns only high priority active tasks', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'High priority', priority: 5, status: 0 },
            { id: 'task2', projectId: 'proj1', title: 'Medium priority', priority: 3, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'High completed', priority: 5, status: 2 },
            { id: 'task4', projectId: 'proj1', title: 'Another high', priority: 5, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.priority();

    assert.equal(result.count, 2);
    assert.ok(result.tasks.every(t => t.priority === 'high'));
    assert.ok(!result.tasks.find(t => t.title === 'High completed'));
  });
});

describe('ID resolution', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('resolves short project ID to full ID', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'abcd1234567890', name: 'Work' },
          { id: 'xyz9876543210', name: 'Personal' },
        ];
      }
      if (path.includes('abcd1234567890/data')) {
        return { tasks: [] };
      }
      return {};
    });

    await tasks.list('abcd1234');

    const dataCall = mockApiRequest.mock.calls.find(c => c.arguments[1].includes('/data'));
    assert.ok(dataCall.arguments[1].includes('abcd1234567890'));
  });

  test('resolves short task ID within project', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task_abc_123456789', title: 'Task A' },
            { id: 'task_xyz_987654321', title: 'Task B' },
          ],
        };
      }
      if (path.includes('/task/task_abc_123456789')) {
        return { id: 'task_abc_123456789', projectId: 'proj123456789', title: 'Task A', priority: 0, status: 0 };
      }
      return {};
    });

    const result = await tasks.get('proj1234', 'task_abc');

    assert.equal(result.fullId, 'task_abc_123456789');
  });

  test('passes full ID without resolution', async () => {
    const fullId = 'a'.repeat(24); // Full ID is > 8 chars

    mockApiRequest = mock.fn(async (method, path) => {
      if (path.includes(`/project/${fullId}/data`)) {
        return { tasks: [] };
      }
      return {};
    });

    await tasks.list(fullId);

    // Should not call /project to resolve
    const projectListCall = mockApiRequest.mock.calls.find(c => c.arguments[1] === '/project');
    assert.equal(projectListCall, undefined);
  });
});

describe('Input validation', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('create with empty title throws error', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      return {};
    });

    await assert.rejects(
      () => tasks.create('proj1234', ''),
      { message: 'Title is required' }
    );

    await assert.rejects(
      () => tasks.create('proj1234', '   '),
      { message: 'Title is required' }
    );

    await assert.rejects(
      () => tasks.create('proj1234', null),
      { message: 'Title is required' }
    );
  });

  test('special characters in IDs are URL encoded', async () => {
    // Security test: verify path traversal attempts are handled
    // Use a malicious ID that's > 8 chars so it's treated as a full ID
    const maliciousId = '../../../etc/passwd';

    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        // Return projects for short ID resolution
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      // Verify the path doesn't contain raw path traversal
      if (path.includes('/data')) {
        assert.ok(!path.includes('../'), 'Path should not contain raw path traversal');
      }
      return { tasks: [] };
    });

    await tasks.list(maliciousId);

    // Find the /data call and verify encodeURIComponent was applied
    const dataCall = mockApiRequest.mock.calls.find(c => c.arguments[1].includes('/data'));
    assert.ok(dataCall, 'Should have made a /data call');
    assert.ok(dataCall.arguments[1].includes('%2F'), 'Slashes should be encoded');
    assert.ok(!dataCall.arguments[1].includes('../'), 'Should not contain raw path traversal');
  });

  test('handles null/undefined tags gracefully in search results', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj1', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', projectId: 'proj1', title: 'No tags', priority: 0, status: 0, tags: null },
            { id: 'task2', projectId: 'proj1', title: 'Undefined tags', priority: 0, status: 0 },
            { id: 'task3', projectId: 'proj1', title: 'Has tags', priority: 0, status: 0, tags: ['test'] },
          ],
        };
      }
      return {};
    });

    const result = await tasks.search('');

    // All tasks should be returned with tags normalized to empty array or actual array
    assert.equal(result.count, 3);
    assert.ok(result.tasks.every(t => Array.isArray(t.tags)));
  });
});

describe('Edge cases', () => {
  beforeEach(() => {
    mockApiRequest = mock.fn();
    mockLoadConfig = mock.fn(() => ({ region: 'global', clientId: 'test', clientSecret: 'test' }));
    mockLoadTokens = mock.fn(() => ({ accessToken: 'test-token', expiresAt: Date.now() + 3600000 }));
  });

  test('handles task with all optional fields missing', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [{
            id: 'task123456789',
            title: 'Minimal task',
            // No content, dueDate, tags, priority, etc.
          }],
        };
      }
      return {};
    });

    const result = await tasks.list('proj1234');

    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Minimal task');
    assert.equal(result[0].content, '');
    assert.deepEqual(result[0].tags, []);
    assert.equal(result[0].priority, 'none');
    assert.equal(result[0].status, 'active');
  });

  test('handles unknown status values', async () => {
    // TickTick might have status values other than 0 and 2
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', title: 'Status 0', status: 0, priority: 0 },
            { id: 'task2', title: 'Status 1 (unknown)', status: 1, priority: 0 },
            { id: 'task3', title: 'Status 2', status: 2, priority: 0 },
            { id: 'task4', title: 'Status 3 (unknown)', status: 3, priority: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.list('proj1234');

    // Current behavior: anything != 2 is 'active'
    // This documents that behavior
    assert.equal(result[0].status, 'active');  // status 0
    assert.equal(result[1].status, 'active');  // status 1 - treated as active
    assert.equal(result[2].status, 'completed');  // status 2
    assert.equal(result[3].status, 'active');  // status 3 - treated as active
  });

  test('handles unknown priority values', async () => {
    mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (path.includes('/data')) {
        return {
          tasks: [
            { id: 'task1', title: 'Priority 0', priority: 0, status: 0 },
            { id: 'task2', title: 'Priority 2 (unknown)', priority: 2, status: 0 },
            { id: 'task3', title: 'Priority 4 (unknown)', priority: 4, status: 0 },
            { id: 'task4', title: 'Priority 99 (unknown)', priority: 99, status: 0 },
          ],
        };
      }
      return {};
    });

    const result = await tasks.list('proj1234');

    // Current behavior: unknown priorities become 'none'
    // This might hide data issues - consider logging warnings
    assert.equal(result[0].priority, 'none');  // 0 = none
    assert.equal(result[1].priority, 'none');  // 2 = unknown -> 'none'
    assert.equal(result[2].priority, 'none');  // 4 = unknown -> 'none'
    assert.equal(result[3].priority, 'none');  // 99 = unknown -> 'none'
  });
});
