#!/usr/bin/env node
/**
 * TickTick MCP Server - Entry point
 *
 * Runs an MCP server over stdio for integration with Claude Desktop
 * and other MCP clients.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from '../lib/mcp.js';

const server = createServer();
const transport = new StdioServerTransport();

await server.connect(transport);
