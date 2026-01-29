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
      format: 'json',
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
    return '(empty)';
  }

  const lines = arr.map((item, i) => {
    if (typeof item === 'object' && item !== null) {
      // For tasks/projects, show key fields
      const id = item.id || '';
      const name = item.name || item.title || '';
      const extra = item.dueDate ? ` (due: ${item.dueDate})` : '';
      const priority = item.priority && item.priority !== 'none' ? ` [${item.priority}]` : '';
      return `${i + 1}. ${name}${priority}${extra}\n   ID: ${id}`;
    }
    return `${i + 1}. ${item}`;
  });

  return lines.join('\n');
}

/**
 * Format object as key-value pairs
 */
function formatObject(obj) {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: ${value.length} items`);
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
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
  --format <type>   Output format: json (default) or text

Run 'ticktick <command> --help' for command-specific help.

Examples:
  ticktick auth status
  ticktick projects list
  ticktick tasks create inbox "Buy groceries" --due 2026-01-30
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
  create <project_id> <title>      Create task
  update <task_id>                 Update task
  complete <project_id> <task_id>  Complete task
  delete <project_id> <task_id>    Delete task
  search <keyword>                 Search all tasks
  due [days]                       Tasks due within N days (default: 7)
  priority                         High priority tasks

Create/Update options:
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
  ticktick tasks list inbox
  ticktick tasks create inbox "Buy groceries" --due 2026-01-30 --priority high
  ticktick tasks create inbox "Call mom" --tags "personal,family"
  ticktick tasks complete PROJECT_ID TASK_ID
  ticktick tasks search "meeting"
  ticktick tasks search --tags "work"
  ticktick tasks due 3`;
}
