/**
 * TickTick CLI - Task operations
 */

import { apiRequest, parseReminder, parsePriority, formatPriority, shortId, isShortId } from './core.js';

/**
 * List tasks in a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object[]>}
 */
export async function list(projectId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const data = await apiRequest('GET', `/project/${encodeURIComponent(resolvedProjectId)}/data`);
  return data.tasks.map((t) => ({
    id: shortId(t.id),
    fullId: t.id,
    title: t.title,
    content: t.content || '',
    dueDate: t.dueDate,
    priority: formatPriority(t.priority),
    tags: t.tags || [],
    status: t.status === 2 ? 'completed' : 'active',
    completedTime: t.completedTime,
  }));
}

/**
 * Get task details
 * @param {string} projectId - Project ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object>}
 */
export async function get(projectId, taskId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const resolvedTaskId = await resolveTaskId(taskId, resolvedProjectId);
  const task = await apiRequest(
    'GET',
    `/project/${encodeURIComponent(resolvedProjectId)}/task/${encodeURIComponent(resolvedTaskId)}`
  );
  return {
    id: shortId(task.id),
    fullId: task.id,
    projectId: shortId(task.projectId),
    fullProjectId: task.projectId,
    title: task.title,
    content: task.content,
    dueDate: task.dueDate,
    startDate: task.startDate,
    priority: formatPriority(task.priority),
    tags: task.tags || [],
    status: task.status === 2 ? 'completed' : 'active',
    completedTime: task.completedTime,
    reminders: task.reminders,
    repeatFlag: task.repeatFlag,
    items: task.items,
    createdTime: task.createdTime,
    modifiedTime: task.modifiedTime,
  };
}

/**
 * Create a new task
 * @param {string} projectId - Project ID
 * @param {string} title - Task title
 * @param {object} options - Optional settings
 * @returns {Promise<object>}
 */
export async function create(projectId, title, options = {}) {
  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  const resolvedProjectId = await resolveProjectId(projectId);
  const input = { title: title.trim(), projectId: resolvedProjectId };

  if (options.content) input.content = options.content;
  if (options.dueDate) input.dueDate = options.dueDate;
  if (options.priority) input.priority = parsePriority(options.priority);
  if (options.tags) input.tags = Array.isArray(options.tags) ? options.tags : options.tags.split(',').map((t) => t.trim());
  if (options.reminder) {
    const reminder = parseReminder(options.reminder);
    if (reminder) input.reminders = [reminder];
  }

  const task = await apiRequest('POST', '/task', input);
  return {
    success: true,
    task: {
      id: shortId(task.id),
      fullId: task.id,
      projectId: shortId(task.projectId),
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
      tags: task.tags || [],
    },
  };
}

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {object} options - Fields to update
 * @returns {Promise<object>}
 */
export async function update(taskId, options = {}) {
  const resolvedTaskId = await resolveTaskId(taskId);
  const input = { id: resolvedTaskId };

  if (options.title) input.title = options.title;
  if (options.content) input.content = options.content;
  if (options.dueDate) input.dueDate = options.dueDate;
  if (options.priority) input.priority = parsePriority(options.priority);
  if (options.tags) input.tags = Array.isArray(options.tags) ? options.tags : options.tags.split(',').map((t) => t.trim());
  if (options.reminder) {
    const reminder = parseReminder(options.reminder);
    if (reminder) input.reminders = [reminder];
  }

  const task = await apiRequest('POST', `/task/${encodeURIComponent(resolvedTaskId)}`, input);
  return {
    success: true,
    task: {
      id: shortId(task.id),
      fullId: task.id,
      projectId: shortId(task.projectId),
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
      tags: task.tags || [],
    },
  };
}

/**
 * Complete a task
 * @param {string} projectId - Project ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object>}
 */
export async function complete(projectId, taskId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const resolvedTaskId = await resolveTaskId(taskId, resolvedProjectId);
  await apiRequest(
    'POST',
    `/project/${encodeURIComponent(resolvedProjectId)}/task/${encodeURIComponent(resolvedTaskId)}/complete`
  );
  return {
    success: true,
    message: `Task ${shortId(resolvedTaskId)} completed`,
  };
}

/**
 * Delete a task
 * @param {string} projectId - Project ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object>}
 */
export async function remove(projectId, taskId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const resolvedTaskId = await resolveTaskId(taskId, resolvedProjectId);
  await apiRequest(
    'DELETE',
    `/project/${encodeURIComponent(resolvedProjectId)}/task/${encodeURIComponent(resolvedTaskId)}`
  );
  return {
    success: true,
    message: `Task ${shortId(resolvedTaskId)} deleted`,
  };
}

/**
 * Search tasks across all projects
 * @param {string} keyword - Search keyword
 * @param {object} options - Search options
 * @returns {Promise<object>}
 */
export async function search(keyword, options = {}) {
  const projects = await apiRequest('GET', '/project');
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const matchingTasks = data.tasks.filter((t) => {
        // Text search in title and content
        const textMatch =
          !keyword ||
          t.title.toLowerCase().includes(keyword.toLowerCase()) ||
          (t.content && t.content.toLowerCase().includes(keyword.toLowerCase()));

        // Tag filter
        const tagMatch =
          !options.tags ||
          (t.tags && options.tags.some((tag) => t.tags.includes(tag)));

        // Priority filter
        const priorityMatch =
          !options.priority ||
          formatPriority(t.priority) === options.priority.toLowerCase();

        return textMatch && tagMatch && priorityMatch;
      });
      for (const task of matchingTasks) {
        results.push({
          id: shortId(task.id),
          fullId: task.id,
          projectId: shortId(task.projectId),
          projectName: project.name,
          title: task.title,
          content: task.content || '',
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
          tags: task.tags || [],
          status: task.status === 2 ? 'completed' : 'active',
        });
      }
    } catch {
      // Skip projects we can't access
    }
  }

  return {
    keyword,
    count: results.length,
    tasks: results,
  };
}

/**
 * Get tasks due within N days (includes overdue tasks)
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<object>}
 */
export async function due(days = 7) {
  const projects = await apiRequest('GET', '/project');
  const results = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const dueTasks = data.tasks.filter((t) => {
        if (!t.dueDate || t.status === 2) return false;
        const dueDate = new Date(t.dueDate);
        // Include overdue tasks (dueDate < now) and tasks due within the window
        return dueDate <= cutoff;
      });
      for (const task of dueTasks) {
        results.push({
          id: shortId(task.id),
          fullId: task.id,
          projectId: shortId(task.projectId),
          projectName: project.name,
          title: task.title,
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
          tags: task.tags || [],
        });
      }
    } catch {
      // Skip projects we can't access
    }
  }

  // Sort by due date
  results.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return {
    days,
    count: results.length,
    tasks: results,
  };
}

/**
 * Get high priority tasks
 * @returns {Promise<object>}
 */
export async function priority() {
  const projects = await apiRequest('GET', '/project');
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const highPriority = data.tasks.filter((t) => t.priority === 5 && t.status !== 2);
      for (const task of highPriority) {
        results.push({
          id: shortId(task.id),
          fullId: task.id,
          projectId: shortId(task.projectId),
          projectName: project.name,
          title: task.title,
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
          tags: task.tags || [],
        });
      }
    } catch {
      // Skip projects we can't access
    }
  }

  return {
    count: results.length,
    tasks: results,
  };
}

/**
 * Resolve a project ID (handles short IDs and inbox)
 * @param {string} projectId - Project ID, short ID, or empty for inbox
 * @returns {Promise<string>} - Full project ID
 */
async function resolveProjectId(projectId) {
  // If it looks like a full ID (> 8 chars), return as-is without API call
  if (projectId && !isShortId(projectId)) {
    return projectId;
  }

  // Need to fetch projects for inbox lookup or short ID resolution
  const projects = await apiRequest('GET', '/project');

  // Empty string or missing means inbox - find the inbox project
  if (!projectId) {
    const inbox = projects.find((p) => p.id.startsWith('inbox'));
    if (inbox) {
      return inbox.id;
    }
    throw new Error('Could not find inbox project. Please specify a project ID.');
  }

  // Try to find matching project by short ID prefix
  const match = projects.find((p) => p.id.startsWith(projectId));
  if (match) {
    return match.id;
  }

  // Return as-is if no match (let API handle the error)
  return projectId;
}

/**
 * Resolve a task ID (handles short IDs)
 * @param {string} taskId - Task ID or short ID
 * @param {string} projectId - Optional project ID to search within
 * @returns {Promise<string>} - Full task ID
 */
async function resolveTaskId(taskId, projectId = null) {
  // If it looks like a full ID, return as-is
  if (!isShortId(taskId)) {
    return taskId;
  }

  // Search for task by short ID
  if (projectId) {
    // Search within specific project
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/data`);
      const match = data.tasks.find((t) => t.id.startsWith(taskId));
      if (match) {
        return match.id;
      }
    } catch {
      // Fall through to search all projects
    }
  }

  // Search all projects
  const projects = await apiRequest('GET', '/project');

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const match = data.tasks.find((t) => t.id.startsWith(taskId));
      if (match) {
        return match.id;
      }
    } catch {
      // Skip projects we can't access
    }
  }

  // Return as-is if no match (let API handle the error)
  return taskId;
}
