/**
 * TickTick CLI - Project operations
 */

import { apiRequest, formatPriority, shortId, isShortId } from './core.mjs';

/**
 * List all projects
 * @returns {Promise<object[]>}
 */
export async function list() {
  const projects = await apiRequest('GET', '/project');
  return projects.map((p) => ({
    id: shortId(p.id),
    fullId: p.id,
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
  const resolvedId = await resolveProjectId(projectId);
  const data = await apiRequest('GET', `/project/${encodeURIComponent(resolvedId)}/data`);
  return {
    project: {
      id: shortId(data.project.id),
      fullId: data.project.id,
      name: data.project.name,
      color: data.project.color,
      viewMode: data.project.viewMode,
    },
    tasks: data.tasks.map((t) => ({
      id: shortId(t.id),
      fullId: t.id,
      title: t.title,
      content: t.content,
      dueDate: t.dueDate,
      priority: formatPriority(t.priority),
      tags: t.tags || [],
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
      id: shortId(project.id),
      fullId: project.id,
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
  const resolvedId = await resolveProjectId(projectId);
  await apiRequest('DELETE', `/project/${encodeURIComponent(resolvedId)}`);
  return {
    success: true,
    message: `Project ${shortId(resolvedId)} deleted`,
  };
}

/**
 * Resolve a project ID (handles short IDs)
 * @param {string} projectId - Project ID or short ID
 * @returns {Promise<string>} - Full project ID
 */
async function resolveProjectId(projectId) {
  // If it looks like a full ID, return as-is
  if (!isShortId(projectId)) {
    return projectId;
  }

  // Try to find matching project
  const projects = await apiRequest('GET', '/project');
  const match = projects.find((p) => p.id.startsWith(projectId));
  if (match) {
    return match.id;
  }

  // Return as-is if no match (let API handle the error)
  return projectId;
}
