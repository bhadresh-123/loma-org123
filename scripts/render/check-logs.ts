#!/usr/bin/env tsx
/**
 * Script to fetch and analyze Render production logs
 * Usage: tsx scripts/render/check-logs.ts [options]
 * 
 * Options:
 *   --service-id <id>     Render service ID (defaults to env var RENDER_SERVICE_ID)
 *   --time <minutes>      How many minutes of logs to fetch (default: 60)
 *   --level <level>       Filter by log level: error, warn, info, debug
 *   --search <text>       Search for specific text in logs
 *   --limit <number>      Maximum number of log entries (default: 100)
 *   --type <type>         Log type: app, request, build
 *   --status <code>       Filter by HTTP status code (e.g., 500, 404)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LogQuery {
  serviceId: string;
  timeMinutes: number;
  level?: string;
  searchText?: string;
  limit: number;
  type?: string;
  statusCode?: string;
}

function parseArgs(): LogQuery {
  const args = process.argv.slice(2);
  const query: LogQuery = {
    serviceId: process.env.RENDER_SERVICE_ID || '',
    timeMinutes: 60,
    limit: 100,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--service-id':
        query.serviceId = args[++i];
        break;
      case '--time':
        query.timeMinutes = parseInt(args[++i]);
        break;
      case '--level':
        query.level = args[++i];
        break;
      case '--search':
        query.searchText = args[++i];
        break;
      case '--limit':
        query.limit = parseInt(args[++i]);
        break;
      case '--type':
        query.type = args[++i];
        break;
      case '--status':
        query.statusCode = args[++i];
        break;
      case '--help':
        console.log(`
Render Production Log Fetcher

Usage: tsx scripts/render/check-logs.ts [options]

Options:
  --service-id <id>     Render service ID (defaults to env var RENDER_SERVICE_ID)
  --time <minutes>      How many minutes of logs to fetch (default: 60)
  --level <level>       Filter by log level: error, warn, info, debug
  --search <text>       Search for specific text in logs
  --limit <number>      Maximum number of log entries (default: 100)
  --type <type>         Log type: app, request, build
  --status <code>       Filter by HTTP status code (e.g., 500, 404)

Examples:
  # Get last hour of error logs
  tsx scripts/render/check-logs.ts --level error --time 60

  # Search for specific text
  tsx scripts/render/check-logs.ts --search "database connection"

  # Get 500 errors from last 24 hours
  tsx scripts/render/check-logs.ts --status 500 --time 1440

  # Get all request logs
  tsx scripts/render/check-logs.ts --type request --limit 200
        `);
        process.exit(0);
    }
  }

  if (!query.serviceId) {
    console.error('❌ Error: Service ID is required. Set RENDER_SERVICE_ID env var or use --service-id flag');
    process.exit(1);
  }

  return query;
}

async function main() {
  const query = parseArgs();

  console.log('🔍 Fetching Render production logs...\n');
  console.log('Configuration:');
  console.log(`  Service ID: ${query.serviceId}`);
  console.log(`  Time range: Last ${query.timeMinutes} minutes`);
  if (query.level) console.log(`  Level: ${query.level}`);
  if (query.searchText) console.log(`  Search: "${query.searchText}"`);
  if (query.type) console.log(`  Type: ${query.type}`);
  if (query.statusCode) console.log(`  Status code: ${query.statusCode}`);
  console.log(`  Limit: ${query.limit} entries\n`);

  // Calculate time range
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - query.timeMinutes * 60 * 1000);

  console.log('📝 Instructions for using Render MCP in Cursor:');
  console.log('\nYou can use the Render MCP tools directly in Cursor chat. Example queries:\n');
  
  console.log('1. Get recent logs:');
  console.log('   "Show me the production logs from the last hour"\n');
  
  console.log('2. Filter by level:');
  console.log('   "Show me error logs from production"\n');
  
  console.log('3. Search for specific issues:');
  console.log('   "Search production logs for database errors"\n');
  
  console.log('4. Filter by status code:');
  console.log('   "Show me all 500 errors from the last 24 hours"\n');
  
  console.log('5. Get request logs:');
  console.log('   "Show me the recent API request logs"\n');

  console.log('\n📊 Render MCP Tool Reference:');
  console.log('  - mcp_Render_list_logs: Fetch logs with filters');
  console.log('  - mcp_Render_list_log_label_values: Discover available log filters');
  console.log('  - mcp_Render_get_service: Get service details');
  console.log('  - mcp_Render_get_metrics: Get performance metrics\n');

  console.log('💡 Example Render MCP queries in Cursor:\n');
  
  const exampleQuery1 = {
    resource: [query.serviceId],
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    limit: query.limit,
  };

  console.log('Get all logs:');
  console.log(JSON.stringify(exampleQuery1, null, 2));
  console.log('');

  if (query.level) {
    const exampleQuery2 = {
      ...exampleQuery1,
      level: [query.level],
    };
    console.log('Get logs filtered by level:');
    console.log(JSON.stringify(exampleQuery2, null, 2));
    console.log('');
  }

  if (query.searchText) {
    const exampleQuery3 = {
      ...exampleQuery1,
      text: [query.searchText],
    };
    console.log('Search logs by text:');
    console.log(JSON.stringify(exampleQuery3, null, 2));
    console.log('');
  }

  console.log('\n✨ Ready to use Render MCP in Cursor!');
  console.log('Just ask me to "check production logs" and I\'ll use the MCP tools automatically.');
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

