/**
 * TickTick CLI - Interactive prompts
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Prompt for task creation details
 * @param {object} defaults - Default values from CLI options
 * @returns {Promise<object>} Task creation parameters
 */
export async function promptTaskCreate(defaults = {}) {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\nCreate a new task\n');

    // Project ID
    const projectId = await rl.question('Project ID (or "inbox"): ') || defaults.projectId || 'inbox';

    // Title (required)
    let title = defaults.title || '';
    while (!title.trim()) {
      title = await rl.question('Title: ');
      if (!title.trim()) {
        console.log('Title is required.');
      }
    }

    // Content (optional)
    const content = await rl.question('Description (optional): ') || defaults.content || '';

    // Due date (optional)
    const dueDate = await rl.question('Due date (YYYY-MM-DD, optional): ') || defaults.dueDate || '';

    // Priority (optional)
    const priorityInput = await rl.question('Priority (none/low/medium/high, optional): ') || defaults.priority || '';
    const priority = priorityInput.toLowerCase() || undefined;

    // Tags (optional)
    const tagsInput = await rl.question('Tags (comma-separated, optional): ') || defaults.tags || '';
    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

    // Reminder (optional)
    const reminder = await rl.question('Reminder (15m/1h/1d, optional): ') || defaults.reminder || '';

    return {
      projectId,
      title,
      content: content || undefined,
      dueDate: dueDate || undefined,
      priority: priority || undefined,
      tags: tags?.length ? tags : undefined,
      reminder: reminder || undefined,
    };
  } finally {
    rl.close();
  }
}

/**
 * Prompt for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>}
 */
export async function confirm(message) {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}
