/**
 * TickTick MCP Server - Tool definitions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as auth from './auth.js';
import * as tasks from './tasks.js';
import * as projects from './projects.js';

/**
 * Create and configure the MCP server
 */
export function createServer(deps = {}) {
  const server = new McpServer({
    name: 'ticktick',
    version: '1.0.0',
  });

  // Auth tools
  server.tool(
    'ticktick_auth_status',
    'Check TickTick authentication status',
    {},
    async () => {
      const result = await auth.status(deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Project tools
  server.tool(
    'ticktick_projects_list',
    'List all TickTick projects',
    {},
    async () => {
      const result = await projects.list(deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_projects_get',
    'Get a TickTick project with its tasks',
    {
      projectId: z.string().describe('Project ID'),
    },
    async ({ projectId }) => {
      const result = await projects.get(projectId, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Task tools
  server.tool(
    'ticktick_tasks_list',
    'List tasks in a TickTick project',
    {
      projectId: z.string().describe('Project ID'),
    },
    async ({ projectId }) => {
      const result = await tasks.list(projectId, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_get',
    'Get details of a specific TickTick task',
    {
      projectId: z.string().describe('Project ID'),
      taskId: z.string().describe('Task ID (short or full)'),
    },
    async ({ projectId, taskId }) => {
      const result = await tasks.get(projectId, taskId, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_create',
    'Create a new task in TickTick',
    {
      title: z.string().describe('Task title'),
      projectId: z.string().optional().default('').describe('Project ID (omit for default project)'),
      content: z.string().optional().describe('Task description/content'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD or ISO 8601)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Task priority'),
      tags: z.array(z.string()).optional().describe('Task tags'),
      reminder: z.string().optional().describe('Reminder before due (e.g., 15m, 1h, 1d)'),
    },
    async ({ title, projectId, content, dueDate, priority, tags, reminder }) => {
      const result = await tasks.create(
        projectId || '',
        title,
        {
          content,
          dueDate,
          priority,
          tags,
          reminder,
        },
        deps
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_update',
    'Update an existing TickTick task',
    {
      taskId: z.string().describe('Task ID (short or full)'),
      title: z.string().optional().describe('New task title'),
      content: z.string().optional().describe('New task description/content'),
      dueDate: z.string().optional().describe('New due date (YYYY-MM-DD or ISO 8601)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('New task priority'),
      tags: z.array(z.string()).optional().describe('New task tags'),
      reminder: z.string().optional().describe('New reminder before due (e.g., 15m, 1h, 1d)'),
    },
    async ({ taskId, title, content, dueDate, priority, tags, reminder }) => {
      const result = await tasks.update(
        taskId,
        {
          title,
          content,
          dueDate,
          priority,
          tags,
          reminder,
        },
        deps
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_complete',
    'Mark a TickTick task as complete',
    {
      projectId: z.string().describe('Project ID'),
      taskId: z.string().describe('Task ID (short or full)'),
    },
    async ({ projectId, taskId }) => {
      const result = await tasks.complete(projectId, taskId, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_delete',
    'Delete a TickTick task',
    {
      projectId: z.string().describe('Project ID'),
      taskId: z.string().describe('Task ID (short or full)'),
    },
    async ({ projectId, taskId }) => {
      const result = await tasks.remove(projectId, taskId, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_search',
    'Search for tasks across all TickTick projects',
    {
      keyword: z.string().optional().describe('Search keyword (searches title and content)'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Filter by priority'),
    },
    async ({ keyword, tags, priority }) => {
      const result = await tasks.search(keyword || '', { tags, priority }, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_due',
    'Get TickTick tasks due within N days',
    {
      days: z.number().optional().default(7).describe('Number of days to look ahead (default: 7)'),
    },
    async ({ days }) => {
      const result = await tasks.due(days, deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_priority',
    'Get high priority TickTick tasks',
    {},
    async () => {
      const result = await tasks.priority(deps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
