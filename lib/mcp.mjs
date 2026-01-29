/**
 * TickTick MCP Server - Tool definitions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as auth from './auth.mjs';
import * as tasks from './tasks.mjs';
import * as projects from './projects.mjs';

/**
 * Create and configure the MCP server
 */
export function createServer() {
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
      const result = await auth.status();
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
      const result = await projects.list();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_projects_get',
    'Get a TickTick project with its tasks',
    {
      projectId: z.string().describe('Project ID (use "inbox" for inbox)'),
    },
    async ({ projectId }) => {
      const result = await projects.get(projectId);
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
      projectId: z.string().describe('Project ID (use "inbox" for inbox)'),
    },
    async ({ projectId }) => {
      const result = await tasks.list(projectId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_create',
    'Create a new task in TickTick',
    {
      projectId: z.string().describe('Project ID (use "inbox" for inbox)'),
      title: z.string().describe('Task title'),
      content: z.string().optional().describe('Task description/content'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD or ISO 8601)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Task priority'),
      reminder: z.string().optional().describe('Reminder before due (e.g., 15m, 1h, 1d)'),
    },
    async ({ projectId, title, content, dueDate, priority, reminder }) => {
      const result = await tasks.create(projectId, title, {
        content,
        dueDate,
        priority,
        reminder,
      });
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
      taskId: z.string().describe('Task ID'),
    },
    async ({ projectId, taskId }) => {
      const result = await tasks.complete(projectId, taskId);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_search',
    'Search for tasks across all TickTick projects',
    {
      keyword: z.string().describe('Search keyword'),
    },
    async ({ keyword }) => {
      const result = await tasks.search(keyword);
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
      const result = await tasks.due(days);
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
      const result = await tasks.priority();
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
