# ticktick-cli

CLI and MCP server for TickTick task management.

## Quickstart

```bash
# Install globally
npm install -g ticktick-cli

# Run interactive setup (creates API credentials and authenticates)
ticktick setup

# Create your first task
ticktick tasks create "Hello TickTick!" --priority high

# See what's due soon
ticktick tasks due
```

The setup wizard will guide you through:
1. Creating an app at https://developer.ticktick.com/
2. Entering your Client ID and Secret
3. Authenticating via OAuth

## Features

- **Easy setup** - Interactive wizard handles configuration
- **Short IDs** - Use abbreviated 8-character IDs for convenience
- **Tags support** - Organize tasks with tags
- **Interactive mode** - Create tasks with guided prompts
- **Human-readable output** - Table format by default, JSON optional
- OAuth 2.0 with automatic token refresh
- Supports global and China regions
- MCP server for Claude Desktop and Claude Code integration

## Installation

```bash
npm install -g ticktick-cli
```

Or use directly with npx:

```bash
npx ticktick-cli setup
```

## Setup

### Option 1: Interactive Setup (Recommended)

```bash
ticktick setup
```

This walks you through the entire setup process interactively.

### Option 2: Manual Setup

#### 1. Get API Credentials

1. Go to https://developer.ticktick.com/
2. Sign in and click "Manage Apps"
3. Click "+App Name" to create a new application
4. Set redirect URI to `http://localhost:18888/callback`
5. Note your **Client ID** and **Client Secret**

#### 2. Configure Credentials

Create `~/.config/ticktick/config.json`:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "redirectUri": "http://localhost:18888/callback",
  "region": "global"
}
```

Or set environment variables:

```bash
export TICKTICK_CLIENT_ID="your_client_id"
export TICKTICK_CLIENT_SECRET="your_client_secret"
```

#### 3. Authenticate

```bash
ticktick auth login
# Opens authorization URL - visit it in your browser
# After authorizing, copy the code from the redirect URL

ticktick auth exchange YOUR_CODE
```

Tokens are stored in `~/.config/ticktick/tokens.json` and auto-refresh.

## CLI Usage

```
ticktick <command> [options]

Commands:
  setup      Interactive setup wizard
  auth       Authentication management
  projects   Project operations
  tasks      Task operations

Global options:
  --help, -h        Show help
  --version, -v     Show version
  --format <type>   Output format: text (default) or json
```

### Tasks

```bash
# Interactive mode (prompts for all fields)
ticktick tasks create

# Create task (goes to default project)
ticktick tasks create "Buy groceries" \
  --due 2026-01-30 \
  --priority high \
  --tags "shopping,errands" \
  --reminder 1h

# Create task in specific project
ticktick tasks create PROJECT_ID "Task title"

# List and get (use short IDs!)
ticktick tasks list PROJECT_ID
ticktick tasks get PROJECT_ID 685cfca6

# Update
ticktick tasks update 685cfca6 --title "New title" --priority medium

# Complete and delete
ticktick tasks complete PROJECT_ID 685cfca6
ticktick tasks delete PROJECT_ID 685cfca6

# Search (by text, tags, or priority)
ticktick tasks search "meeting"
ticktick tasks search --tags "work"
ticktick tasks search --priority high

# Filter by due date
ticktick tasks due 3           # Tasks due in 3 days
ticktick tasks priority        # High priority tasks
```

### Projects

```bash
ticktick projects list                              # List all projects
ticktick projects get PROJECT_ID                    # Get project with tasks
ticktick projects create "Name" --color "#ff6b6b"   # Create project
ticktick projects delete PROJECT_ID                 # Delete project
```

### Authentication

```bash
ticktick auth status           # Check auth status
ticktick auth login            # Get authorization URL
ticktick auth exchange CODE    # Exchange code for tokens
ticktick auth refresh          # Manually refresh token
ticktick auth logout           # Clear tokens
```

### Short IDs

All IDs are displayed as 8-character short IDs for convenience:

```
ID       | Title                          | Due        | Pri
--------------------------------------------------------------
685cfca6 | Buy groceries                  | 2026-01-30 | high
a1b2c3d4 | Call mom                       | 2026-01-31 | medium
```

Use these short IDs in commands instead of full UUIDs.

### Output Formats

```bash
# Table format (default) - human readable
ticktick projects list

# JSON format - for scripting
ticktick projects list --format json
```

## MCP Server

The package includes an MCP (Model Context Protocol) server for AI assistant integration.

### Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "ticktick-mcp"
    }
  }
}
```

Restart Claude Desktop after adding the configuration.

### Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "ticktick-mcp"
    }
  }
}
```

Or add via the CLI:

```bash
claude mcp add ticktick ticktick-mcp
```

### Available MCP Tools

Once configured, the AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `ticktick_auth_status` | Check authentication status |
| `ticktick_projects_list` | List all projects |
| `ticktick_projects_get` | Get project with tasks |
| `ticktick_tasks_list` | List tasks in project |
| `ticktick_tasks_get` | Get task details |
| `ticktick_tasks_create` | Create a new task |
| `ticktick_tasks_update` | Update an existing task |
| `ticktick_tasks_complete` | Mark task as complete |
| `ticktick_tasks_delete` | Delete a task |
| `ticktick_tasks_search` | Search by keyword, tags, or priority |
| `ticktick_tasks_due` | Get tasks due within N days |
| `ticktick_tasks_priority` | Get high priority tasks |

**Example prompts for Claude:**
- "What tasks do I have due this week?"
- "Create a task to buy groceries tomorrow with high priority"
- "Mark my grocery task as complete"
- "Search for all tasks tagged 'work'"

## Using as a Claude Code Skill

This package can be used as a Claude Code skill for natural language task management.

### Installation

1. Clone or download this repository
2. Run `ticktick setup` to configure credentials
3. Copy `SKILL.md` to your project or reference it in your Claude Code configuration

### Adding to Claude Code

Add to your project's `.claude/settings.json`:

```json
{
  "skills": [
    "/path/to/ticktick-cli/SKILL.md"
  ]
}
```

Or symlink SKILL.md to your project:

```bash
ln -s /path/to/ticktick-cli/SKILL.md .claude/skills/ticktick.md
```

The skill provides Claude Code with documentation on how to use the CLI commands.

## Programmatic Usage

```javascript
import * as tasks from 'ticktick-cli/tasks';
import * as projects from 'ticktick-cli/projects';

// List projects
const projectList = await projects.list();

// Create a task with tags (empty string for default project)
const result = await tasks.create('', 'New task', {
  dueDate: '2026-01-30',
  priority: 'high',
  tags: ['work', 'urgent'],
});

// Search by tags
const results = await tasks.search('', { tags: ['work'] });
```

## Configuration Paths

| File | Purpose |
|------|---------|
| `~/.config/ticktick/config.json` | Client credentials |
| `~/.config/ticktick/tokens.json` | OAuth tokens (auto-managed) |

## Reference

**Priority values:** none, low, medium, high

**Date format:** `YYYY-MM-DD` or ISO 8601 (`2026-01-15T17:00:00Z`)

**Reminder format:** `15m`, `30m`, `1h`, `2h`, `1d` (before due time)

**Projects:** Omit project ID to use default; use `ticktick projects list` to see all projects

**Short IDs:** First 8 characters of full ID, used for convenience

## Troubleshooting

### "No config found" error

Run `ticktick setup` to configure your credentials.

### "Not authenticated" error

Run `ticktick auth login` and follow the OAuth flow, or run `ticktick setup` to start fresh.

### Token expired

Tokens auto-refresh, but if you see issues, run `ticktick auth refresh` or `ticktick auth login`.

### MCP server not working

1. Ensure `ticktick-mcp` is in your PATH (installed globally)
2. Check that credentials are configured: `ticktick auth status`
3. Restart Claude Desktop/Claude Code after config changes

## License

MIT
