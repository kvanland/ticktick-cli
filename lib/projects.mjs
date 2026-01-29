/**
 * TickTick CLI - Project operations
 */

import { apiRequest, formatPriority } from './core.mjs';

/**
 * List all projects
 * @returns {Promise<object[]>}
 */
export async function list() {
  const projects = await apiRequest('GET', '/project');
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    viewMode: p.viewMode,
    kind: p.kind,
    closed: p.closed,
  }));
}

/**
 * Get project with tasks
 * @param {string} projectId - Project ID
 * @returns {Promise<object>}
 */
export async function get(projectId) {
  const data = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/data`);
  return {
    project: {
      id: data.project.id,
      name: data.project.name,
      color: data.project.color,
      viewMode: data.project.viewMode,
    },
    tasks: data.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      content: t.content,
      dueDate: t.dueDate,
      priority: formatPriority(t.priority),
      status: t.status === 2 ? 'completed' : 'active',
      completedTime: t.completedTime,
    })),
    taskCount: data.tasks.length,
  };
}

/**
 * Create a new project
 * @param {string} name - Project name
 * @param {object} options - Optional settings
 * @param {string} options.color - Project color
 * @param {string} options.viewMode - View mode
 * @returns {Promise<object>}
 */
export async function create(name, options = {}) {
  const input = { name };
  if (options.color) input.color = options.color;
  if (options.viewMode) input.viewMode = options.viewMode;

  const project = await apiRequest('POST', '/project', input);
  return {
    success: true,
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      viewMode: project.viewMode,
    },
  };
}

/**
 * Delete a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object>}
 */
export async function remove(projectId) {
  await apiRequest('DELETE', `/project/${encodeURIComponent(projectId)}`);
  return {
    success: true,
    message: `Project ${projectId} deleted`,
  };
}
