# TickTick Skill

Manage tasks and projects in TickTick via the CLI.

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
- `TICKTICK_CLIENT_ID`
- `TICKTICK_CLIENT_SECRET`
- `TICKTICK_REDIRECT_URI` (optional)
- `TICKTICK_REGION` (optional: "global" or "china")

### 3. Authenticate

```bash
ticktick auth login
# Visit the URL and authorize
# Copy the code from the redirect URL

ticktick auth exchange YOUR_CODE
```

## Usage

### Authentication

```bash
ticktick auth status           # Check auth status
ticktick auth login            # Get authorization URL
ticktick auth exchange CODE    # Exchange code for tokens
ticktick auth refresh          # Refresh token manually
ticktick auth logout           # Clear tokens
```

### Projects

```bash
ticktick projects list                                    # List all projects
ticktick projects get PROJECT_ID                          # Get project with tasks
ticktick projects create "Name" --color "#ff6b6b"         # Create project
ticktick projects delete PROJECT_ID                       # Delete project
```

### Tasks

```bash
# Interactive mode - prompts for all fields
ticktick tasks create

# Create with command line options
ticktick tasks create PROJECT_ID "Title" [options]

# List and get tasks (use short 8-char IDs!)
ticktick tasks list inbox
ticktick tasks get inbox 685cfca6

# Update a task
ticktick tasks update TASK_ID [options]

# Complete and delete
ticktick tasks complete PROJECT_ID TASK_ID
ticktick tasks delete PROJECT_ID TASK_ID

# Search (by text, tags, or priority)
ticktick tasks search "keyword"
ticktick tasks search --tags "work,urgent"
ticktick tasks search --priority high

# Filter by due date
ticktick tasks due [days]                                 # Default: 7 days
ticktick tasks priority                                   # High priority tasks
```

**Create/Update options:**
- `--content "description"`
- `--due "2026-01-15"` (YYYY-MM-DD or ISO 8601)
- `--priority none|low|medium|high`
- `--tags "tag1,tag2"` (comma-separated)
- `--reminder 15m|1h|1d` (before due)
- `--title "New title"` (update only)

### Output Formats

```bash
ticktick projects list                  # Table format (default)
ticktick projects list --format json    # JSON format
```

## Short IDs

All IDs are displayed as 8-character short IDs:

```
ID       | Title                          | Due        | Pri
--------------------------------------------------------------
685cfca6 | Buy groceries                  | 2026-01-30 | high
```

Use these short IDs in commands instead of full UUIDs.

## Quick Reference

**Priority values:** none (0), low (1), medium (3), high (5)

**Date format:** `YYYY-MM-DD` or ISO 8601 with time

**Reminder format:** `15m`, `30m`, `1h`, `2h`, `1d`

**Special project ID:** Use `inbox` for the inbox project

## Examples

```bash
# Create a task interactively
ticktick tasks create

# Create a task in inbox with due date, priority, and tags
ticktick tasks create inbox "Buy groceries" --due 2026-01-30 --priority high --tags "shopping"

# Create a task with reminder
ticktick tasks create inbox "Meeting prep" --due 2026-01-30T09:00:00 --reminder 1h

# Get tasks due in the next 3 days
ticktick tasks due 3

# Search for tasks containing "meeting"
ticktick tasks search "meeting"

# Find all high priority tasks
ticktick tasks search --priority high

# Find tasks with specific tags
ticktick tasks search --tags "work"
```

## Config Files

- `~/.config/ticktick/config.json` - Client credentials
- `~/.config/ticktick/tokens.json` - OAuth tokens (auto-managed)
