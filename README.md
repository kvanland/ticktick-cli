# ticktick-cli

CLI and MCP server for TickTick task management.

## Features

- Zero dependencies for core CLI (only MCP SDK for server mode)
- OAuth 2.0 with automatic token refresh
- Supports global and China regions
- JSON and text output formats
- MCP server for Claude Desktop integration

## Installation

```bash
npm install -g ticktick-cli
```

Or use directly with npx:

```bash
npx ticktick-cli auth status
```

## Setup

### 1. Get API Credentials

1. Go to https://developer.ticktick.com/
2. Create a new application
3. Note your **Client ID** and **Client Secret**
4. Set redirect URI to `http://localhost:18888/callback`

### 2. Configure Credentials

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
export TICKTICK_REDIRECT_URI="http://localhost:18888/callback"  # optional
export TICKTICK_REGION="global"  # or "china"
```

### 3. Authenticate

```bash
ticktick auth login
# Opens authorization URL - visit it in your browser
# After authorizing, copy the code from the redirect URL

ticktick auth exchange YOUR_CODE
```

Tokens are stored in `~/.config/ticktick/tokens.json` and auto-refresh.

## CLI Usage

```
ticktick <command> <subcommand> [options]

Commands:
  auth       Authentication management
  projects   Project operations
  tasks      Task operations

Global options:
  --help, -h        Show help
  --version, -v     Show version
  --format <type>   Output format: json (default) or text
```

### Authentication

```bash
ticktick auth status           # Check auth status
ticktick auth login            # Get authorization URL
ticktick auth exchange CODE    # Exchange code for tokens
ticktick auth refresh          # Manually refresh token
ticktick auth logout           # Clear tokens
```

### Projects

```bash
ticktick projects list                              # List all projects
ticktick projects get PROJECT_ID                    # Get project with tasks
ticktick projects create "Name" --color "#ff6b6b"   # Create project
ticktick projects delete PROJECT_ID                 # Delete project
```

### Tasks

```bash
# List and get
ticktick tasks list PROJECT_ID
ticktick tasks get PROJECT_ID TASK_ID

# Create with options
ticktick tasks create inbox "Buy groceries" \
  --due 2026-01-30 \
  --priority high \
  --reminder 1h

# Update
ticktick tasks update TASK_ID --title "New title" --priority medium

# Complete and delete
ticktick tasks complete PROJECT_ID TASK_ID
ticktick tasks delete PROJECT_ID TASK_ID

# Search and filter
ticktick tasks search "meeting"
ticktick tasks due 3           # Tasks due in 3 days
ticktick tasks priority        # High priority tasks
```

### Output Formats

```bash
# JSON (default) - for scripting
ticktick projects list

# Text - for human reading
ticktick projects list --format text
```

## MCP Server

The package includes an MCP server for integration with Claude Desktop and other MCP clients.

### Claude Desktop Configuration

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "ticktick-mcp"
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "node",
      "args": ["/path/to/ticktick-cli/bin/ticktick-mcp.mjs"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `ticktick_auth_status` | Check authentication status |
| `ticktick_projects_list` | List all projects |
| `ticktick_projects_get` | Get project with tasks |
| `ticktick_tasks_list` | List tasks in project |
| `ticktick_tasks_create` | Create a new task |
| `ticktick_tasks_complete` | Mark task as complete |
| `ticktick_tasks_search` | Search tasks by keyword |
| `ticktick_tasks_due` | Get tasks due within N days |
| `ticktick_tasks_priority` | Get high priority tasks |

## Programmatic Usage

```javascript
import { apiRequest, loadTokens } from 'ticktick-cli/core';
import * as tasks from 'ticktick-cli/tasks';
import * as projects from 'ticktick-cli/projects';

// List projects
const projectList = await projects.list();

// Create a task
const result = await tasks.create('inbox', 'New task', {
  dueDate: '2026-01-30',
  priority: 'high',
});
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

**Special project IDs:** Use `inbox` for the inbox project

## License

MIT
