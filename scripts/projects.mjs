#!/usr/bin/env node
/**
 * TickTick Projects Script
 */

import { apiRequest } from './lib.mjs';

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'list':
        await listProjects();
        break;
      case 'get':
        if (!args[0]) {
          console.error('Usage: node projects.mjs get PROJECT_ID');
          process.exit(1);
        }
        await getProject(args[0]);
        break;
      case 'create':
        if (!args[0]) {
          console.error('Usage: node projects.mjs create "Name" [--color "#fff"] [--view list|kanban|timeline]');
          process.exit(1);
        }
        await createProject(args);
        break;
      case 'delete':
        if (!args[0]) {
          console.error('Usage: node projects.mjs delete PROJECT_ID');
          process.exit(1);
        }
        await deleteProject(args[0]);
        break;
      default:
        console.log('TickTick Projects');
        console.log('');
        console.log('Commands:');
        console.log('  list              - List all projects');
        console.log('  get PROJECT_ID    - Get project with tasks');
        console.log('  create "Name"     - Create new project');
        console.log('  delete PROJECT_ID - Delete project');
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function listProjects() {
  const projects = await apiRequest('GET', '/project');
  console.log(JSON.stringify(projects.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    viewMode: p.viewMode,
    kind: p.kind,
    closed: p.closed,
  })), null, 2));
}

async function getProject(projectId) {
  const data = await apiRequest('GET', `/project/${encodeURIComponent(projectId)}/data`);
  console.log(JSON.stringify({
    project: {
      id: data.project.id,
      name: data.project.name,
      color: data.project.color,
      viewMode: data.project.viewMode,
    },
    tasks: data.tasks.map(t => ({
      id: t.id,
      title: t.title,
      content: t.content,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.status,
      completedTime: t.completedTime,
    })),
    taskCount: data.tasks.length,
  }, null, 2));
}

async function createProject(args) {
  const name = args[0];
  const input = { name };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--color' && args[i + 1]) {
      input.color = args[++i];
    } else if (args[i] === '--view' && args[i + 1]) {
      input.viewMode = args[++i];
    }
  }

  const project = await apiRequest('POST', '/project', input);
  console.log(JSON.stringify({
    success: true,
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      viewMode: project.viewMode,
    },
  }, null, 2));
}

async function deleteProject(projectId) {
  await apiRequest('DELETE', `/project/${encodeURIComponent(projectId)}`);
  console.log(JSON.stringify({
    success: true,
    message: `Project ${projectId} deleted`,
  }, null, 2));
}

main();
