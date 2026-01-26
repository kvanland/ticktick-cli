# TickTick Skill

Manage tasks and projects in TickTick via the REST API.

## Setup

### 1. Get API Credentials

1. Go to https://developer.ticktick.com/
2. Create a new application
3. Note your **Client ID** and **Client Secret**
4. Set redirect URI to `http://localhost:18888/callback`

### 2. Configure Credentials

Create `~/.clawdbot/ticktick/config.json`:

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
- `TICKTICK_REDIRECT_URI` (optional, defaults to http://localhost:8080/callback)
- `TICKTICK_REGION` (optional: "global" or "china")

### 3. Authenticate

Run the auth script to complete OAuth:

```bash
node /root/clawd/skills/ticktick/scripts/auth.mjs setup
```

This will:
1. Print an authorization URL
2. You visit the URL and authorize
3. Copy the `code` parameter from the redirect URL
4. Run: `node /root/clawd/skills/ticktick/scripts/auth.mjs exchange CODE`

Tokens are stored in `~/.clawdbot/ticktick/tokens.json` and auto-refresh.

## Usage

All scripts are in `/root/clawd/skills/ticktick/scripts/`.

### Authentication

```bash
# Check auth status
node scripts/auth.mjs status

# Get authorization URL
node scripts/auth.mjs setup

# Exchange code for tokens
node scripts/auth.mjs exchange AUTH_CODE

# Refresh token manually
node scripts/auth.mjs refresh

# Logout (clear tokens)
node scripts/auth.mjs logout
```

### Projects

```bash
# List all projects
node scripts/projects.mjs list

# Get project with tasks
node scripts/projects.mjs get PROJECT_ID

# Create project
node scripts/projects.mjs create "Project Name" [--color "#ff6b6b"] [--view list|kanban|timeline]

# Delete project
node scripts/projects.mjs delete PROJECT_ID
```

### Tasks

```bash
# List tasks in project
node scripts/tasks.mjs list PROJECT_ID

# Get task details
node scripts/tasks.mjs get PROJECT_ID TASK_ID

# Create task
node scripts/tasks.mjs create PROJECT_ID "Task title" [options]
#   --content "description"
#   --due "2024-01-15T17:00:00Z"
#   --priority none|low|medium|high
#   --reminder 15m|1h|1d (before due)

# Update task
node scripts/tasks.mjs update TASK_ID [options]
#   --title "New title"
#   --content "New description"
#   --priority none|low|medium|high
#   --due "2024-01-15T17:00:00Z"

# Complete task
node scripts/tasks.mjs complete PROJECT_ID TASK_ID

# Delete task
node scripts/tasks.mjs delete PROJECT_ID TASK_ID

# Search tasks
node scripts/tasks.mjs search "keyword"

# Get tasks due soon (next N days)
node scripts/tasks.mjs due [days=7]

# Get high priority tasks
node scripts/tasks.mjs priority
```

## Quick Reference

**Priority values:** none (0), low (1), medium (3), high (5)

**Date format:** ISO 8601 (`2024-01-15T17:00:00Z` or `2024-01-15T17:00:00+0000`)

**Reminder format:** `15m`, `30m`, `1h`, `2h`, `1d` (before due time)

## Testing

Run all tests:
```bash
node /root/clawd/skills/ticktick/scripts/test.mjs
```

Or run individual test files:
```bash
# Unit tests for lib functions (no API calls)
node --test scripts/lib.test.mjs

# Integration tests for CLI behavior
node --test scripts/tasks.test.mjs
```

### Test Coverage

- **lib.test.mjs**: Pure function tests
  - `parseReminder()` — "15m", "1h", "1d" → iCalendar TRIGGER format
  - `parsePriority()` / `formatPriority()` — priority string ↔ number
  - `isTokenExpired()` — token expiration with 60s buffer
  - `getAuthorizationUrl()` — OAuth URL generation

- **tasks.test.mjs**: CLI behavior tests
  - Argument validation for all commands
  - Due date format expectations
  - Priority value mapping
  - Task status values

### Adding Tests

When adding new functionality:
1. Add unit tests for pure functions in `lib.test.mjs`
2. Add CLI/behavior tests in `tasks.test.mjs`
3. Run `node scripts/test.mjs` to verify

## Files

- `~/.clawdbot/ticktick/config.json` - Client credentials
- `~/.clawdbot/ticktick/tokens.json` - OAuth tokens (auto-managed)
