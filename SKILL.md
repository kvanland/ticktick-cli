# TickTick Skill

Manage tasks and projects in TickTick via the CLI.

## Installation

### 1. Install the CLI

```bash
npm install -g ticktick-cli
```

### 2. Run Setup

```bash
ticktick setup
```

This interactive wizard will:
1. Guide you to create an app at https://developer.ticktick.com/
2. Save your Client ID and Secret
3. Complete the OAuth authentication

### 3. Verify Installation

```bash
ticktick auth status
```

## Usage

### Creating Tasks

```bash
# Interactive mode - prompts for all fields
ticktick tasks create

# Quick task (goes to default project)
ticktick tasks create "Task title"

# Task with options
ticktick tasks create "Buy groceries" --due 2026-01-30 --priority high --tags "shopping"

# Task in specific project
ticktick tasks create PROJECT_ID "Task title"
```

### Viewing Tasks

```bash
# Tasks due soon (default: 7 days)
ticktick tasks due
ticktick tasks due 3              # Due in 3 days

# High priority tasks
ticktick tasks priority

# Search tasks
ticktick tasks search "meeting"
ticktick tasks search --tags "work"
ticktick tasks search --priority high

# List tasks in a project
ticktick tasks list PROJECT_ID
```

### Managing Tasks

```bash
# Get task details
ticktick tasks get PROJECT_ID TASK_ID

# Update a task
ticktick tasks update TASK_ID --title "New title" --priority medium

# Complete a task
ticktick tasks complete PROJECT_ID TASK_ID

# Delete a task
ticktick tasks delete PROJECT_ID TASK_ID
```

### Projects

```bash
ticktick projects list                            # List all projects
ticktick projects get PROJECT_ID                  # Get project with tasks
ticktick projects create "Name" --color "#ff6b6b" # Create project
ticktick projects delete PROJECT_ID               # Delete project
```

### Authentication

```bash
ticktick auth status    # Check auth status
ticktick auth login     # Start OAuth flow
ticktick auth logout    # Clear tokens
```

## Options Reference

**Create/Update options:**
- `--content "description"` - Task description
- `--due "2026-01-15"` - Due date (YYYY-MM-DD or ISO 8601)
- `--priority none|low|medium|high` - Task priority
- `--tags "tag1,tag2"` - Comma-separated tags
- `--reminder 15m|1h|1d` - Reminder before due time
- `--title "New title"` - New title (update only)

**Output options:**
- `--format json` - Output as JSON instead of table

## Short IDs

All IDs are displayed as 8-character short IDs:

```
ID       | Title                          | Due        | Pri
--------------------------------------------------------------
685cfca6 | Buy groceries                  | 2026-01-30 | high
```

Use these short IDs in commands instead of full UUIDs.

## Examples

```bash
# Create a task with due date and tags
ticktick tasks create "Buy groceries" --due 2026-01-30 --priority high --tags "shopping"

# Create a task with reminder (1 hour before due)
ticktick tasks create "Meeting prep" --due 2026-01-30T09:00:00 --reminder 1h

# Get tasks due in the next 3 days
ticktick tasks due 3

# Search for all work-related tasks
ticktick tasks search --tags "work"

# Complete a task
ticktick tasks complete PROJECT_ID 685cfca6
```

## Troubleshooting

**"No config found"** - Run `ticktick setup`

**"Not authenticated"** - Run `ticktick auth login` or `ticktick setup`

**Token expired** - Run `ticktick auth refresh`
