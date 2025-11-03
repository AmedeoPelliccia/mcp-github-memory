#!/usr/bin/env node

import { GitHubMemoryDB } from './database.js';
import { MCPServer } from './mcp-server.js';
import { WebhookHandler } from './webhook.js';

const args = process.argv.slice(2);
const mode = args[0] || 'mcp';

// Database configuration
const dbPath = process.env.GITHUB_MEMORY_DB_PATH || './github-memory.db';
const db = new GitHubMemoryDB(dbPath);

if (mode === 'webhook') {
  // Run as webhook server
  const port = parseInt(process.env.WEBHOOK_PORT || '3000', 10);
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  
  const webhookHandler = new WebhookHandler(db, webhookSecret);
  webhookHandler.start(port);
} else if (mode === 'mcp') {
  // Run as MCP server
  const mcpServer = new MCPServer(db);
  mcpServer.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
} else {
  console.error('Invalid mode. Use "mcp" or "webhook"');
  process.exit(1);
}

// Graceful shutdown
function gracefulShutdown() {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
