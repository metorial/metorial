import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchLogs = SlateTool.create(spec, {
  name: 'Search Logs',
  key: 'search_logs',
  description: `Search and retrieve logs from Datadog using query syntax. Filter logs by time range, service, status, and custom attributes.
Uses the Datadog log search query language, e.g. \`service:my-service status:error\`.`,
  instructions: [
    'Use Datadog log query syntax for filtering, e.g. "service:web status:error".',
    'Time range is specified as ISO 8601 timestamps.',
    'Use cursor for pagination when there are more results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Log search query, e.g. "service:web status:error". Defaults to "*"'),
      from: z.string().describe('Start time as ISO 8601 string, e.g. "2024-01-01T00:00:00Z"'),
      to: z.string().describe('End time as ISO 8601 string, e.g. "2024-01-02T00:00:00Z"'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of logs to return (default 50, max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      sort: z
        .enum(['timestamp', '-timestamp'])
        .optional()
        .describe('Sort order: "timestamp" (ascending) or "-timestamp" (descending)'),
      indexes: z
        .array(z.string())
        .optional()
        .describe('Log indexes to search. Defaults to all indexes.')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            logId: z.string().optional(),
            timestamp: z.string().optional(),
            host: z.string().optional(),
            service: z.string().optional(),
            status: z.string().optional(),
            message: z.string().optional(),
            tags: z.array(z.string()).optional(),
            attributes: z.any().optional()
          })
        )
        .describe('List of log entries'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.searchLogs(ctx.input);

    let logs = (result.data || []).map((log: any) => ({
      logId: log.id,
      timestamp: log.attributes?.timestamp,
      host: log.attributes?.host,
      service: log.attributes?.service,
      status: log.attributes?.status,
      message: log.attributes?.message,
      tags: log.attributes?.tags,
      attributes: log.attributes?.attributes
    }));

    let nextCursor = result.meta?.page?.after;

    return {
      output: { logs, nextCursor },
      message: `Found **${logs.length}** log entries${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
