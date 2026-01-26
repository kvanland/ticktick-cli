#!/usr/bin/env node
/**
 * TickTick Tasks Script
 */

import { apiRequest, parseReminder, parsePriority, formatPriority } from './lib.mjs';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'list':
        if (!args[0]) {
          console.error('Usage: node tasks.mjs list PROJECT_ID');
          process.exit(1);
        }
        await listTasks(args[0]);
        break;
      case 'get':
        if (!args[0] || !args[1]) {
          console.error('Usage: node tasks.mjs get PROJECT_ID TASK_ID');
          process.exit(1);
        }
        await getTask(args[0], args[1]);
        break;
      case 'create':
        if (!args[0] || !args[1]) {
          console.error('Usage: node tasks.mjs create PROJECT_ID "Title" [options]');
          process.exit(1);
        }
        await createTask(args[0], args.slice(1));
        break;
      case 'update':
        if (!args[0]) {
          console.error('Usage: node tasks.mjs update TASK_ID [options]');
          process.exit(1);
        }
        await updateTask(args[0], args.slice(1));
        break;
      case 'complete':
        if (!args[0] || !args[1]) {
          console.error('Usage: node tasks.mjs complete PROJECT_ID TASK_ID');
          process.exit(1);
        }
        await completeTask(args[0], args[1]);
        break;
      case 'delete':
        if (!args[0] || !args[1]) {
          console.error('Usage: node tasks.mjs delete PROJECT_ID TASK_ID');
          process.exit(1);
        }
        await deleteTask(args[0], args[1]);
        break;
      case 'search':
        if (!args[0]) {
          console.error('Usage: node tasks.mjs search "keyword"');
          process.exit(1);
        }
        await searchTasks(args[0]);
        break;
      case 'due':
        await getTasksDueSoon(parseInt(args[0]) || 7);
        break;
      case 'priority':
        await getHighPriorityTasks();
        break;
      default:
        console.log('TickTick Tasks');
        console.log('');
        console.log('Commands:');
        console.log('  list PROJECT_ID              - List tasks in project');
        console.log('  get PROJECT_ID TASK_ID       - Get task details');
        console.log('  create PROJECT_ID "Title"    - Create task');
        console.log('  update TASK_ID [options]     - Update task');
        console.log('  complete PROJECT_ID TASK_ID  - Complete task');
        console.log('  delete PROJECT_ID TASK_ID    - Delete task');
        console.log('  search "keyword"             - Search all tasks');
        console.log('  due [days]                   - Tasks due soon');
        console.log('  priority                     - High priority tasks');
        console.log('');
        console.log('Create/Update options:');
        console.log('  --content "description"');
        console.log('  --due "2024-01-15T17:00:00Z"');
        console.log('  --priority none|low|medium|high');
        console.log('  --reminder 15m|1h|1d');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function listTasks(projectId) {
  const data = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/data`);
  console.log(JSON.stringify(data.tasks.map(t => ({
    id: t.id,
    title: t.title,
    content: t.content || '',
    dueDate: t.dueDate,
    priority: formatPriority(t.priority),
    status: t.status === 2 ? 'completed' : 'active',
    completedTime: t.completedTime,
  })), null, 2));
}

async function getTask(projectId, taskId) {
  const task = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`);
  console.log(JSON.stringify({
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
  }, null, 2));
}

async function createTask(projectId, args) {
  const title = args[0];
  const input = { title, projectId };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--content' && args[i + 1]) {
      input.content = args[++i];
    } else if (args[i] === '--due' && args[i + 1]) {
      input.dueDate = args[++i];
    } else if (args[i] === '--priority' && args[i + 1]) {
      input.priority = parsePriority(args[++i]);
    } else if (args[i] === '--reminder' && args[i + 1]) {
      const reminder = parseReminder(args[++i]);
      if (reminder) input.reminders = [reminder];
    }
  }

  const task = await apiRequest('POST', '/task', input);
  console.log(JSON.stringify({
    success: true,
    task: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
    },
  }, null, 2));
}

async function updateTask(taskId, args) {
  const input = { id: taskId };

  // Parse options
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      input.title = args[++i];
    } else if (args[i] === '--content' && args[i + 1]) {
      input.content = args[++i];
    } else if (args[i] === '--due' && args[i + 1]) {
      input.dueDate = args[++i];
    } else if (args[i] === '--priority' && args[i + 1]) {
      input.priority = parsePriority(args[++i]);
    } else if (args[i] === '--reminder' && args[i + 1]) {
      const reminder = parseReminder(args[++i]);
      if (reminder) input.reminders = [reminder];
    }
  }

  const task = await apiRequest('POST', `/task/${encodeURIComponent(taskId)}`, input);
  console.log(JSON.stringify({
    success: true,
    task: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      dueDate: task.dueDate,
      priority: formatPriority(task.priority),
    },
  }, null, 2));
}

async function completeTask(projectId, taskId) {
  await apiRequest('POST', `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`);
  console.log(JSON.stringify({
    success: true,
    message: `Task ${taskId} completed`,
  }, null, 2));
}

async function deleteTask(projectId, taskId) {
  await apiRequest('DELETE', `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`);
  console.log(JSON.stringify({
    success: true,
    message: `Task ${taskId} deleted`,
  }, null, 2));
}

async function searchTasks(keyword) {
  // Get all projects first (including inbox)
  const projects = await apiRequest('GET', '/project');
  projects.unshift({ id: 'inbox', name: 'Inbox' }); // Add inbox
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const matchingTasks = data.tasks.filter(t =>
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

  console.log(JSON.stringify({
    keyword,
    count: results.length,
    tasks: results,
  }, null, 2));
}

async function getTasksDueSoon(days) {
  const projects = await apiRequest('GET', '/project');
  projects.unshift({ id: 'inbox', name: 'Inbox' }); // Add inbox
  const results = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const dueTasks = data.tasks.filter(t => {
        if (!t.dueDate || t.status === 2) return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= cutoff;
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

  console.log(JSON.stringify({
    days,
    count: results.length,
    tasks: results,
  }, null, 2));
}

async function getHighPriorityTasks() {
  const projects = await apiRequest('GET', '/project');
  projects.unshift({ id: 'inbox', name: 'Inbox' }); // Add inbox
  const results = [];

  for (const project of projects) {
    try {
      const data = await apiRequest('GET', `/project/${encodeURIComponent(project.id)}/data`);
      const highPriority = data.tasks.filter(t => t.priority === 5 && t.status !== 2);
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

  console.log(JSON.stringify({
    count: results.length,
    tasks: results,
  }, null, 2));
}

main();
