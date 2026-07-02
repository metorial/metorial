import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

let logEntrySchema = z.object({
  logId: z.number().describe('Unique log entry identifier'),
  time: z.string().describe('Timestamp in ISO-8601 format (UTC)'),
  originator: z.string().optional().describe('Name of the user who performed the action'),
  apiKeyName: z
    .string()
    .optional()
    .describe('API key name used (only for API-triggered actions)'),
  resource: z.string().optional().describe('Entity associated with the action'),
  entryType: z.string().optional().describe('Category of the action'),
  description: z.string().optional().describe('Detailed description of the action')
});

export let getLogs = SlateTool.create(spec, {
  name: 'Get System Logs',
  key: 'get_logs',
  description: `Retrieve system audit logs for the Redis Cloud account. Logs track API requests, console actions, and changes to subscriptions, databases, users, and other entities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().default(0).describe('Starting offset for results (0 = latest)'),
      limit: z
        .number()
        .default(100)
        .describe('Maximum number of log entries to return (default 100)')
    })
  )
  .output(
    z.object({
      entries: z.array(logEntrySchema).describe('System log entries sorted by ID descending')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.getLogs({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let rawEntries = data?.entries || data || [];
    if (!Array.isArray(rawEntries)) rawEntries = [];

    let entries = rawEntries.map((e: any) => ({
      logId: e.id,
      time: e.time,
      originator: e.originator,
      apiKeyName: e.apiKeyName,
      resource: e.resource,
      entryType: e.type,
      description: e.description
    }));

    return {
      output: { entries },
      message: `Retrieved **${entries.length}** log entry(s).`
    };
  })
  .build();
