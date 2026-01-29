/**
 * TickTick CLI - Task operations
 */

import { apiRequest, parseReminder, parsePriority, formatPriority } from './core.mjs';

/**
 * List tasks in a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object[]>}
 */
export async function list(projectId) {
  const data = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/data`);
  return data.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    content: t.content || '',
    dueDate: t.dueDate,
    priority: formatPriority(t.priority),
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
  const task = await apiRequest(
    'GET',
    `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
  );
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    content: task.content,
    dueDate: task.dueDate,
    startDate: task.startDate,
    priority: formatPriority(task.priority),
    status: task.status === 2 ? 'completed' : 'active',
    completedTime: task.completedTime,
    reminders: task.reminders,
    repeatFlag: task.repeatFlag,
    tags: task.tags,
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
  const input = { title, projectId };

  if (options.content) input.content = options.content;
  if (options.dueDate) input.dueDate = options.dueDate;
  if (options.priority) input.priority = parsePriority(options.priority);
  if (options.reminder) {
    const reminder = parseReminder(options.reminder);
    if (reminder) input.reminders = [reminder];
  }

  const task = await apiRequest('POST', '/task', input);
  return {
    success: true,
    task: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
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
  const input = { id: taskId };

  if (options.title) input.title = options.title;
  if (options.content) input.content = options.content;
  if (options.dueDate) input.dueDate = options.dueDate;
  if (options.priority) input.priority = parsePriority(options.priority);
  if (options.reminder) {
    const reminder = parseReminder(options.reminder);
    if (reminder) input.reminders = [reminder];
  }

  const task = await apiRequest('POST', `/task/${encodeURIComponent(taskId)}`, input);
  return {
    success: true,
    task: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
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
  await apiRequest(
    'POST',
    `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`
  );
  return {
    success: true,
    message: `Task ${taskId} completed`,
  };
}

/**
 * Delete a task
 * @param {string} projectId - Project ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object>}
 */
export async function remove(projectId, taskId) {
  await apiRequest(
    'DELETE',
    `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
  );
  return {
    success: true,
    message: `Task ${taskId} deleted`,
  };
}

/**
 * Search tasks across all projects
 * @param {string} keyword - Search keyword
 * @returns {Promise<object>}
 */
export async function search(keyword) {
  const projects = await apiRequest('GET', '/project');
  projects.unshift({ id: 'inbox', name: 'Inbox' });
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const matchingTasks = data.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(keyword.toLowerCase()) ||
          (t.content && t.content.toLowerCase().includes(keyword.toLowerCase()))
      );
      for (const task of matchingTasks) {
        results.push({
          id: task.id,
          projectId: task.projectId,
          projectName: project.name,
          title: task.title,
          content: task.content || '',
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
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
 * Get tasks due within N days
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<object>}
 */
export async function due(days = 7) {
  const projects = await apiRequest('GET', '/project');
  projects.unshift({ id: 'inbox', name: 'Inbox' });
  const results = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const dueTasks = data.tasks.filter((t) => {
        if (!t.dueDate || t.status === 2) return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= now && dueDate <= cutoff;
      });
      for (const task of dueTasks) {
        results.push({
          id: task.id,
          projectId: task.projectId,
          projectName: project.name,
          title: task.title,
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
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
  projects.unshift({ id: 'inbox', name: 'Inbox' });
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const highPriority = data.tasks.filter((t) => t.priority === 5 && t.status !== 2);
      for (const task of highPriority) {
        results.push({
          id: task.id,
          projectId: task.projectId,
          projectName: project.name,
          title: task.title,
          dueDate: task.dueDate,
          priority: formatPriority(task.priority),
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
