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
  const {
    auth: authModule = auth,
    tasks: tasksModule = tasks,
    projects: projectsModule = projects,
    ...moduleDeps
  } = deps;
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
      const result = await authModule.status(moduleDeps);
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
      const result = await projectsModule.list(moduleDeps);
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
      const result = await projectsModule.get(projectId, moduleDeps);
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
      const result = await tasksModule.list(projectId, moduleDeps);
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
      const result = await tasksModule.get(projectId, taskId, moduleDeps);
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
      const result = await tasksModule.create(
        projectId || '',
        title,
        {
          content,
          dueDate,
          priority,
          tags,
          reminder,
        },
        moduleDeps
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
      const result = await tasksModule.update(
        taskId,
        {
          title,
          content,
          dueDate,
          priority,
          tags,
          reminder,
        },
        moduleDeps
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
      const result = await tasksModule.complete(projectId, taskId, moduleDeps);
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
      const result = await tasksModule.remove(projectId, taskId, moduleDeps);
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
      const result = await tasksModule.search(keyword || '', { tags, priority }, moduleDeps);
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
      folder: z.string().optional().describe('Filter by project folder (groupId)'),
    },
    async ({ days, folder }) => {
      const result = await tasksModule.due(days, { folder }, moduleDeps);
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
      const result = await tasksModule.priority(moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_completed',
    'List completed TickTick tasks within a date range',
    {
      projectIds: z.array(z.string()).optional().describe('Project IDs to filter (omit for all projects)'),
      folder: z.string().optional().describe('Filter by project folder (groupId)'),
      startDate: z.string().optional().describe('Start of date range, ISO 8601 (e.g. 2026-03-06T00:00:00.000+0000)'),
      endDate: z.string().optional().describe('End of date range, ISO 8601 (e.g. 2026-03-06T23:59:59.000+0000)'),
    },
    async ({ projectIds, folder, startDate, endDate }) => {
      const result = await tasksModule.listCompleted({ projectIds, folder, startDate, endDate }, moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Vector search tools
  server.tool(
    'ticktick_tasks_semantic_search',
    'Semantic search across all TickTick tasks using vector similarity. Much faster and more relevant than keyword search for natural language queries. Falls back to keyword search if vector infra is unavailable.',
    {
      query: z.string().describe('Natural language search query'),
      limit: z.number().optional().default(5).describe('Max results (default: 5)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Filter by priority'),
    },
    async ({ query, limit, priority }) => {
      const result = await tasksModule.semanticSearch(query, { limit, priority }, moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_tasks_similar',
    'Find tasks semantically similar to a given task. Useful for deduplication or finding related work.',
    {
      taskId: z.string().describe('Task ID (short or full)'),
      limit: z.number().optional().default(5).describe('Max results (default: 5)'),
    },
    async ({ taskId, limit }) => {
      const result = await tasksModule.findSimilar(taskId, { limit }, moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_vector_sync',
    'Sync tasks into the vector index for semantic search. Run this after adding many tasks, or set up as a cron job.',
    {
      forceFull: z.boolean().optional().default(false).describe('Re-embed all tasks (default: incremental)'),
      maxEmbeddings: z.number().optional().default(200).describe('Max embeddings per run (default: 200)'),
    },
    async ({ forceFull, maxEmbeddings }) => {
      const result = await tasksModule.vectorSync({ forceFull, maxEmbeddings }, moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'ticktick_vector_status',
    'Check vector index health and statistics',
    {},
    async () => {
      const result = await tasksModule.vectorStatus(moduleDeps);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
