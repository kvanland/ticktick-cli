/**
 * TickTick CLI - Argument parsing and output formatting
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parse command-line arguments
 * @param {string[]} args - process.argv.slice(2)
 * @returns {{ command: string, subcommand: string, positional: string[], options: object }}
 */
export function parseArgs(args) {
  const result = {
    command: null,
    subcommand: null,
    positional: [],
    options: {
      format: 'text',
      help: false,
      version: false,
    },
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.options.version = true;
    } else if (arg === '--format' && args[i + 1]) {
      result.options.format = args[++i];
    } else if (arg.startsWith('--') && args[i + 1] && !args[i + 1].startsWith('-')) {
      // Generic option with value
      const key = arg.slice(2);
      result.options[key] = args[++i];
    } else if (arg.startsWith('--')) {
      // Boolean flag
      const key = arg.slice(2);
      result.options[key] = true;
    } else if (!result.command) {
      result.command = arg;
    } else if (!result.subcommand) {
      result.subcommand = arg;
    } else {
      result.positional.push(arg);
    }

    i++;
  }

  return result;
}

/**
 * Format output based on format option
 * @param {any} data - Data to format
 * @param {string} format - 'json' or 'text'
 * @returns {string}
 */
export function formatOutput(data, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  // Text format - simple table-like output
  if (Array.isArray(data)) {
    return formatArray(data);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObject(data);
  }

  return String(data);
}

/**
 * Format array as text table
 */
function formatArray(arr) {
  if (arr.length === 0) {
    return '(no items)';
  }

  // Check if this is a task list or project list
  const first = arr[0];
  if (typeof first !== 'object' || first === null) {
    return arr.map((item, i) => `${i + 1}. ${item}`).join('\n');
  }

  // Format as table
  const lines = [];

  // Detect type and format accordingly
  if ('title' in first) {
    // Task list
    lines.push('ID       | Title                          | Due        | Pri    | Tags');
    lines.push('-'.repeat(80));
    for (const item of arr) {
      const id = (item.id || '').padEnd(8);
      const title = truncate(item.title || '', 30).padEnd(30);
      const due = (item.dueDate ? item.dueDate.slice(0, 10) : '').padEnd(10);
      const pri = (item.priority || 'none').padEnd(6);
      const tags = (item.tags || []).join(', ');
      lines.push(`${id} | ${title} | ${due} | ${pri} | ${tags}`);
    }
  } else if ('name' in first) {
    // Project list
    lines.push('ID       | Name                           | Color');
    lines.push('-'.repeat(55));
    for (const item of arr) {
      const id = (item.id || '').padEnd(8);
      const name = truncate(item.name || '', 30).padEnd(30);
      const color = item.color || '';
      lines.push(`${id} | ${name} | ${color}`);
    }
  } else {
    // Generic object list
    for (const item of arr) {
      lines.push(formatObject(item));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format object as key-value pairs
 */
function formatObject(obj) {
  const lines = [];

  // Handle nested task/project in result objects
  if (obj.task && typeof obj.task === 'object') {
    if (obj.success) lines.push('Success!');
    lines.push('');
    lines.push(formatTaskDetail(obj.task));
    return lines.join('\n');
  }

  if (obj.project && typeof obj.project === 'object') {
    if (obj.success) lines.push('Success!');
    lines.push('');
    lines.push(formatProjectDetail(obj.project));
    if (obj.tasks) {
      lines.push('');
      lines.push(`Tasks (${obj.taskCount}):`);
      lines.push(formatArray(obj.tasks));
    }
    return lines.join('\n');
  }

  // Handle search/due/priority results
  if (obj.tasks && Array.isArray(obj.tasks)) {
    if (obj.keyword !== undefined) lines.push(`Search: "${obj.keyword}"`);
    if (obj.days !== undefined) lines.push(`Due within: ${obj.days} days`);
    lines.push(`Found: ${obj.count} tasks`);
    lines.push('');
    lines.push(formatArray(obj.tasks));
    return lines.join('\n');
  }

  // Handle task detail
  if ('title' in obj && 'fullId' in obj) {
    return formatTaskDetail(obj);
  }

  // Handle auth status
  if ('authenticated' in obj) {
    return formatAuthStatus(obj);
  }

  // Generic key-value format
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (key === 'fullId' || key === 'fullProjectId') continue; // Skip full IDs in text mode
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${formatKey(key)}: ${value.join(', ')}`);
    } else if (typeof value === 'object') {
      lines.push(`${formatKey(key)}:`);
      lines.push(indent(formatObject(value), 2));
    } else {
      lines.push(`${formatKey(key)}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format a task detail view
 */
function formatTaskDetail(task) {
  const lines = [];
  lines.push(`Title: ${task.title}`);
  lines.push(`ID: ${task.id}${task.fullId ? ` (${task.fullId})` : ''}`);
  if (task.projectId) lines.push(`Project: ${task.projectId}`);
  if (task.content) lines.push(`Description: ${task.content}`);
  if (task.dueDate) lines.push(`Due: ${task.dueDate}`);
  lines.push(`Priority: ${task.priority || 'none'}`);
  if (task.tags?.length) lines.push(`Tags: ${task.tags.join(', ')}`);
  if (task.status) lines.push(`Status: ${task.status}`);
  if (task.createdTime) lines.push(`Created: ${task.createdTime}`);
  if (task.modifiedTime) lines.push(`Modified: ${task.modifiedTime}`);
  return lines.join('\n');
}

/**
 * Format a project detail view
 */
function formatProjectDetail(project) {
  const lines = [];
  lines.push(`Name: ${project.name}`);
  lines.push(`ID: ${project.id}${project.fullId ? ` (${project.fullId})` : ''}`);
  if (project.color) lines.push(`Color: ${project.color}`);
  if (project.viewMode) lines.push(`View: ${project.viewMode}`);
  return lines.join('\n');
}

/**
 * Format auth status
 */
function formatAuthStatus(status) {
  if (!status.authenticated) {
    return `Not authenticated\n${status.message || ''}`;
  }
  const lines = ['Authenticated'];
  if (status.expired) lines.push('Token: EXPIRED');
  else lines.push(`Token: valid (expires ${status.expiresIn})`);
  if (status.tokenPath) lines.push(`Config: ${status.tokenPath}`);
  return lines.join('\n');
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Format key name (camelCase to Title Case)
 */
function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

/**
 * Indent text
 */
function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map((line) => pad + line).join('\n');
}

/**
 * Get package version
 */
export async function getVersion() {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Generate main help text
 */
export function getMainHelp() {
  return `TickTick CLI - Manage tasks and projects

Usage: ticktick <command> <subcommand> [options]

Commands:
  auth       Authentication management
  projects   Project operations
  tasks      Task operations

Global options:
  --help, -h        Show help
  --version, -v     Show version
  --format <type>   Output format: text (default) or json

Run 'ticktick <command> --help' for command-specific help.

Examples:
  ticktick auth status
  ticktick projects list
  ticktick tasks create "Buy groceries" --due 2026-01-30
  ticktick tasks list PROJECT_ID --format text`;
}

/**
 * Generate auth command help
 */
export function getAuthHelp() {
  return `ticktick auth - Authentication management

Usage: ticktick auth <subcommand>

Subcommands:
  status     Check authentication status
  login      Get authorization URL for OAuth flow
  exchange   Exchange authorization code for tokens
  refresh    Manually refresh access token
  logout     Clear stored tokens

Examples:
  ticktick auth status
  ticktick auth login
  ticktick auth exchange AUTH_CODE`;
}

/**
 * Generate projects command help
 */
export function getProjectsHelp() {
  return `ticktick projects - Project operations

Usage: ticktick projects <subcommand> [options]

Subcommands:
  list                   List all projects
  get <project_id>       Get project with tasks
  create <name>          Create new project
  delete <project_id>    Delete project

Create options:
  --color <hex>          Project color (e.g., "#ff6b6b")
  --view <mode>          View mode: list, kanban, or timeline

Examples:
  ticktick projects list
  ticktick projects get PROJECT_ID
  ticktick projects create "My Project" --color "#ff6b6b"`;
}

/**
 * Generate tasks command help
 */
export function getTasksHelp() {
  return `ticktick tasks - Task operations

Usage: ticktick tasks <subcommand> [options]

Subcommands:
  list <project_id>                List tasks in project
  get <project_id> <task_id>       Get task details
  create <title>                   Create task (in default project)
  create <project_id> <title>      Create task (in specific project)
  update <task_id>                 Update task
  complete <project_id> <task_id>  Complete task
  delete <project_id> <task_id>    Delete task
  search <keyword>                 Search all tasks
  due [days]                       Tasks due within N days (default: 7)
  priority                         High priority tasks

Create/Update options:
  --project <id>         Project ID (for create, optional)
  --content <text>       Task description
  --due <date>           Due date (ISO 8601 or YYYY-MM-DD)
  --priority <level>     Priority: none, low, medium, high
  --tags <tags>          Comma-separated tags
  --reminder <time>      Reminder: 15m, 1h, 1d (before due)
  --title <text>         New title (update only)

Search options:
  --tags <tags>          Filter by tags (comma-separated)
  --priority <level>     Filter by priority

Examples:
  ticktick tasks create "Buy groceries" --due 2026-01-30 --priority high
  ticktick tasks create "Call mom" --tags "personal,family"
  ticktick tasks create PROJECT_ID "Task in specific project"
  ticktick tasks list PROJECT_ID
  ticktick tasks complete PROJECT_ID TASK_ID
  ticktick tasks search "meeting"
  ticktick tasks search --tags "work"
  ticktick tasks due 3`;
}
