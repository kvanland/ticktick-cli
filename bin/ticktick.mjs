#!/usr/bin/env node
/**
 * TickTick CLI - Main entry point
 */

import {
  parseArgs,
  formatOutput,
  getVersion,
  getMainHelp,
  getAuthHelp,
  getProjectsHelp,
  getTasksHelp,
} from '../lib/cli.mjs';
import * as auth from '../lib/auth.mjs';
import * as tasks from '../lib/tasks.mjs';
import * as projects from '../lib/projects.mjs';
import { promptTaskCreate } from '../lib/interactive.mjs';
import { runSetup } from '../lib/setup.mjs';

const args = parseArgs(process.argv.slice(2));

async function main() {
  try {
    // Handle version flag
    if (args.options.version) {
      console.log(await getVersion());
      return;
    }

    // Handle help for main command
    if (!args.command || (args.options.help && !args.command)) {
      console.log(getMainHelp());
      return;
    }

    // Route to command handlers
    let result;
    switch (args.command) {
      case 'setup':
        result = await runSetup();
        break;
      case 'auth':
        result = await handleAuth();
        break;
      case 'projects':
        result = await handleProjects();
        break;
      case 'tasks':
        result = await handleTasks();
        break;
      default:
        console.error(`Unknown command: ${args.command}`);
        console.log(getMainHelp());
        process.exit(1);
    }

    // Output result if any
    if (result !== undefined) {
      console.log(formatOutput(result, args.options.format));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleAuth() {
  if (args.options.help || !args.subcommand) {
    console.log(getAuthHelp());
    return;
  }

  switch (args.subcommand) {
    case 'status':
      return await auth.status();
    case 'login':
      return await auth.login();
    case 'exchange':
      if (!args.positional[0]) {
        console.error('Usage: ticktick auth exchange AUTH_CODE');
        process.exit(1);
      }
      return await auth.exchange(args.positional[0]);
    case 'refresh':
      return await auth.refresh();
    case 'logout':
      return await auth.logout();
    default:
      console.error(`Unknown auth subcommand: ${args.subcommand}`);
      console.log(getAuthHelp());
      process.exit(1);
  }
}

async function handleProjects() {
  if (args.options.help || !args.subcommand) {
    console.log(getProjectsHelp());
    return;
  }

  switch (args.subcommand) {
    case 'list':
      return await projects.list();
    case 'get':
      if (!args.positional[0]) {
        console.error('Usage: ticktick projects get PROJECT_ID');
        process.exit(1);
      }
      return await projects.get(args.positional[0]);
    case 'create':
      if (!args.positional[0]) {
        console.error('Usage: ticktick projects create NAME [--color HEX] [--view MODE]');
        process.exit(1);
      }
      return await projects.create(args.positional[0], {
        color: args.options.color,
        viewMode: args.options.view,
      });
    case 'delete':
      if (!args.positional[0]) {
        console.error('Usage: ticktick projects delete PROJECT_ID');
        process.exit(1);
      }
      return await projects.remove(args.positional[0]);
    default:
      console.error(`Unknown projects subcommand: ${args.subcommand}`);
      console.log(getProjectsHelp());
      process.exit(1);
  }
}

async function handleTasks() {
  if (args.options.help || !args.subcommand) {
    console.log(getTasksHelp());
    return;
  }

  switch (args.subcommand) {
    case 'list':
      if (!args.positional[0]) {
        console.error('Usage: ticktick tasks list PROJECT_ID');
        process.exit(1);
      }
      return await tasks.list(args.positional[0]);
    case 'get':
      if (!args.positional[0] || !args.positional[1]) {
        console.error('Usage: ticktick tasks get PROJECT_ID TASK_ID');
        process.exit(1);
      }
      return await tasks.get(args.positional[0], args.positional[1]);
    case 'create': {
      // Support both: "create TITLE" (default project) and "create PROJECT_ID TITLE"
      let projectId = args.options.project || '';
      let title = args.positional[0];

      // If two positional args given, first is project, second is title
      if (args.positional.length >= 2) {
        projectId = args.positional[0];
        title = args.positional[1];
      }

      let options = {
        content: args.options.content,
        dueDate: args.options.due,
        priority: args.options.priority,
        tags: args.options.tags,
        reminder: args.options.reminder,
      };

      // Interactive mode if title not provided and stdin is a TTY
      if (!title && process.stdin.isTTY) {
        const input = await promptTaskCreate({
          projectId,
          title,
          ...options,
        });
        projectId = input.projectId || '';
        title = input.title;
        options = {
          content: input.content,
          dueDate: input.dueDate,
          priority: input.priority,
          tags: input.tags,
          reminder: input.reminder,
        };
      } else if (!title) {
        console.error('Usage: ticktick tasks create TITLE [options]');
        console.error('       ticktick tasks create PROJECT_ID TITLE [options]');
        console.error('Run without arguments for interactive mode.');
        process.exit(1);
      }

      return await tasks.create(projectId, title, options);
    }
    case 'update':
      if (!args.positional[0]) {
        console.error('Usage: ticktick tasks update TASK_ID [options]');
        process.exit(1);
      }
      return await tasks.update(args.positional[0], {
        title: args.options.title,
        content: args.options.content,
        dueDate: args.options.due,
        priority: args.options.priority,
        tags: args.options.tags,
        reminder: args.options.reminder,
      });
    case 'complete':
      if (!args.positional[0] || !args.positional[1]) {
        console.error('Usage: ticktick tasks complete PROJECT_ID TASK_ID');
        process.exit(1);
      }
      return await tasks.complete(args.positional[0], args.positional[1]);
    case 'delete':
      if (!args.positional[0] || !args.positional[1]) {
        console.error('Usage: ticktick tasks delete PROJECT_ID TASK_ID');
        process.exit(1);
      }
      return await tasks.remove(args.positional[0], args.positional[1]);
    case 'search': {
      const keyword = args.positional[0] || '';
      const searchTags = args.options.tags ? args.options.tags.split(',').map((t) => t.trim()) : null;
      if (!keyword && !searchTags && !args.options.priority) {
        console.error('Usage: ticktick tasks search [KEYWORD] [--tags TAGS] [--priority LEVEL]');
        process.exit(1);
      }
      return await tasks.search(keyword, {
        tags: searchTags,
        priority: args.options.priority,
      });
    }
    case 'due':
      return await tasks.due(parseInt(args.positional[0]) || 7);
    case 'priority':
      return await tasks.priority();
    default:
      console.error(`Unknown tasks subcommand: ${args.subcommand}`);
      console.log(getTasksHelp());
      process.exit(1);
  }
}

main();
