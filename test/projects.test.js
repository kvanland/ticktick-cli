#!/usr/bin/env node
/**
 * TickTick CLI - Unit Tests for lib/projects.js
 * Tests project operations with mocked API calls
 * Run: node --test test/projects.test.js
 */

import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

const projects = await import('../lib/projects.js');

describe('projects.list', () => {
  test('returns formatted project list', async () => {
    const mockApiRequest = mock.fn(async () => [
      {
        id: 'proj123456789abc',
        name: 'Work',
        color: '#FF0000',
        viewMode: 'list',
        kind: 'TASK',
        closed: false,
      },
      {
        id: 'proj987654321xyz',
        name: 'Personal',
        color: '#00FF00',
        viewMode: 'kanban',
        kind: 'TASK',
        closed: true,
      },
    ]);

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    const result = await projects.list(mockDeps);

    assert.equal(result.length, 2);

    assert.equal(result[0].id, 'proj1234');
    assert.equal(result[0].fullId, 'proj123456789abc');
    assert.equal(result[0].name, 'Work');
    assert.equal(result[0].color, '#FF0000');
    assert.equal(result[0].viewMode, 'list');
    assert.equal(result[0].kind, 'TASK');
    assert.equal(result[0].closed, false);

    assert.equal(result[1].id, 'proj9876');
    assert.equal(result[1].name, 'Personal');
    assert.equal(result[1].closed, true);
  });

  test('returns empty array when no projects', async () => {
    const mockApiRequest = mock.fn(async () => []);
    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    const result = await projects.list(mockDeps);

    assert.equal(result.length, 0);
    assert.deepEqual(result, []);
  });

  test('calls correct API endpoint', async () => {
    const mockApiRequest = mock.fn(async () => []);
    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    await projects.list(mockDeps);

    assert.equal(mockApiRequest.mock.calls.length, 1);
    assert.equal(mockApiRequest.mock.calls[0].arguments[0], 'GET');
    assert.equal(mockApiRequest.mock.calls[0].arguments[1], '/project');
  });
});

describe('projects.get', () => {
  test('returns project with tasks', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789', name: 'Work' }];
      }
      if (path.includes('/data')) {
        return {
          project: {
            id: 'proj123456789',
            name: 'Work',
            color: '#FF0000',
            viewMode: 'list',
          },
          tasks: [
            {
              id: 'task1234567890',
              title: 'Task 1',
              content: 'Description',
              dueDate: '2026-01-30',
              priority: 5,
              tags: ['urgent'],
              status: 0,
            },
            {
              id: 'task0987654321',
              title: 'Task 2',
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

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      formatPriority: (p) => (p === 5 ? 'high' : 'none'),
      isShortId: (id) => id.length <= 8,
    };

    const result = await projects.get('proj1234', mockDeps);

    assert.equal(result.project.id, 'proj1234');
    assert.equal(result.project.fullId, 'proj123456789');
    assert.equal(result.project.name, 'Work');
    assert.equal(result.project.color, '#FF0000');

    assert.equal(result.tasks.length, 2);
    assert.equal(result.taskCount, 2);

    assert.equal(result.tasks[0].id, 'task1234');
    assert.equal(result.tasks[0].title, 'Task 1');
    assert.equal(result.tasks[0].priority, 'high');
    assert.equal(result.tasks[0].status, 'active');

    assert.equal(result.tasks[1].status, 'completed');
    assert.ok(result.tasks[1].completedTime);
  });

  test('resolves short project ID', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'abcd1234567890123456', name: 'Work' },
          { id: 'xyz98765432109876543', name: 'Personal' },
        ];
      }
      if (path.includes('abcd1234567890123456/data')) {
        return {
          project: { id: 'abcd1234567890123456', name: 'Work' },
          tasks: [],
        };
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      formatPriority: (p) => (p === 5 ? 'high' : 'none'),
      isShortId: (id) => id.length <= 8,
    };

    const result = await projects.get('abcd1234', mockDeps);

    assert.equal(result.project.fullId, 'abcd1234567890123456');
  });

  test('passes full ID without resolution', async () => {
    const fullId = 'abcdef1234567890abcdef';

    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === `/project/${fullId}/data`) {
        return {
          project: { id: fullId, name: 'Work' },
          tasks: [],
        };
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      formatPriority: (p) => (p === 5 ? 'high' : 'none'),
      isShortId: (id) => id.length <= 8,
    };

    await projects.get(fullId, mockDeps);

    // Should not call /project to resolve (full ID > 8 chars)
    const projectListCall = mockApiRequest.mock.calls.find(c => c.arguments[1] === '/project');
    assert.equal(projectListCall, undefined);
  });
});

describe('projects.create', () => {
  test('creates project with name only', async () => {
    const mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST' && path === '/project') {
        return {
          id: 'newproj123456',
          name: body.name,
          color: null,
          viewMode: 'list',
        };
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    const result = await projects.create('New Project', undefined, mockDeps);

    assert.equal(result.success, true);
    assert.equal(result.project.name, 'New Project');
    assert.equal(result.project.id, 'newproj1');
    assert.equal(result.project.fullId, 'newproj123456');

    const postCall = mockApiRequest.mock.calls[0];
    assert.equal(postCall.arguments[0], 'POST');
    assert.equal(postCall.arguments[1], '/project');
    assert.deepEqual(postCall.arguments[2], { name: 'New Project' });
  });

  test('creates project with all options', async () => {
    const mockApiRequest = mock.fn(async (method, path, body) => {
      if (method === 'POST') {
        return {
          id: 'newproj123456',
          name: body.name,
          color: body.color,
          viewMode: body.viewMode,
        };
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    const result = await projects.create('New Project', {
      color: '#FF5500',
      viewMode: 'kanban',
    }, mockDeps);

    assert.equal(result.success, true);
    assert.equal(result.project.color, '#FF5500');
    assert.equal(result.project.viewMode, 'kanban');

    const postCall = mockApiRequest.mock.calls[0];
    assert.deepEqual(postCall.arguments[2], {
      name: 'New Project',
      color: '#FF5500',
      viewMode: 'kanban',
    });
  });

  test('ignores undefined options', async () => {
    const mockApiRequest = mock.fn(async (method, path, body) => {
      return { id: 'proj123', name: body.name };
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
    };

    await projects.create('Test', { color: undefined, viewMode: undefined }, mockDeps);

    const postCall = mockApiRequest.mock.calls[0];
    // Should only have 'name', not color or viewMode
    assert.deepEqual(Object.keys(postCall.arguments[2]), ['name']);
  });
});

describe('projects.remove', () => {
  test('deletes project by ID', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'proj123456789' }];
      }
      if (method === 'DELETE') {
        return undefined; // 204 No Content
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      isShortId: (id) => id.length <= 8,
    };

    const result = await projects.remove('proj1234', mockDeps);

    assert.equal(result.success, true);
    assert.ok(result.message.includes('deleted'));
    assert.ok(result.message.includes('proj1234'));

    const deleteCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'DELETE');
    assert.ok(deleteCall);
    assert.ok(deleteCall.arguments[1].includes('proj123456789'));
  });

  test('resolves short ID before deletion', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [
          { id: 'abc123456789012345', name: 'Target' },
          { id: 'xyz987654321098765', name: 'Other' },
        ];
      }
      if (method === 'DELETE') {
        return undefined;
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      isShortId: (id) => id.length <= 8,
    };

    await projects.remove('abc12345', mockDeps);

    const deleteCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'DELETE');
    assert.ok(deleteCall.arguments[1].includes('abc123456789012345'));
  });

  test('uses full ID directly', async () => {
    const fullId = 'abcdef123456789012345';

    const mockApiRequest = mock.fn(async (method, path) => {
      if (method === 'DELETE') {
        return undefined;
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      isShortId: (id) => id.length <= 8,
    };

    await projects.remove(fullId, mockDeps);

    // Should not call /project to resolve
    const projectListCall = mockApiRequest.mock.calls.find(c => c.arguments[1] === '/project');
    assert.equal(projectListCall, undefined);

    const deleteCall = mockApiRequest.mock.calls.find(c => c.arguments[0] === 'DELETE');
    assert.ok(deleteCall.arguments[1].includes(fullId));
  });
});

describe('project ID resolution edge cases', () => {
  test('returns unmatched short ID as-is', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [{ id: 'other1234567890', name: 'Other' }];
      }
      if (path.includes('nomatch/data')) {
        // API would return error but we test the ID is passed through
        return { project: { id: 'nomatch' }, tasks: [] };
      }
      return {};
    });

    // This short ID doesn't match any project
    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      formatPriority: (p) => (p === 5 ? 'high' : 'none'),
      isShortId: (id) => id.length <= 8,
    };

    await projects.get('nomatch', mockDeps);

    const dataCall = mockApiRequest.mock.calls.find(c => c.arguments[1].includes('/data'));
    // Should pass the unmatched ID to the API
    assert.ok(dataCall.arguments[1].includes('nomatch'));
  });

  test('handles empty project list', async () => {
    const mockApiRequest = mock.fn(async (method, path) => {
      if (path === '/project') {
        return [];
      }
      if (path.includes('/data')) {
        return { project: { id: 'test1234' }, tasks: [] };
      }
      return {};
    });

    const mockDeps = {
      apiRequest: mockApiRequest,
      shortId: (id) => id.substring(0, 8),
      formatPriority: (p) => (p === 5 ? 'high' : 'none'),
      isShortId: (id) => id.length <= 8,
    };

    await projects.get('test1234', mockDeps);

    // Should proceed with the original ID
    const dataCall = mockApiRequest.mock.calls.find(c => c.arguments[1].includes('/data'));
    assert.ok(dataCall.arguments[1].includes('test1234'));
  });
});
