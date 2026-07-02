import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

export let searchLogs = SlateTool.create(spec, {
  name: 'Search Logs',
  key: 'search_logs',
  description: `Search and export log lines from Mezmo using the Export API v2. Supports filtering by query, time range, log levels, applications, and hosts. Returns results in JSON format with pagination support for large result sets.`,
  instructions: [
    'Time range is specified as Unix timestamps in seconds.',
    'Pass "0" for "from" to use the retention boundary, or "0" for "to" to use the current time.',
    'Use paginationId from a previous response to retrieve the next page of results.'
  ],
  constraints: [
    'Each request returns a maximum of 10,000 log lines.',
    'Use pagination for result sets exceeding 10,000 lines.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z
        .number()
        .describe('Start time as Unix timestamp in seconds (use 0 for retention boundary)'),
      to: z
        .number()
        .describe('End time as Unix timestamp in seconds (use 0 for current time)'),
      query: z.string().optional().describe('Search query string to filter logs'),
      levels: z
        .string()
        .optional()
        .describe('Comma-separated log levels (e.g., "error,warn")'),
      apps: z.string().optional().describe('Comma-separated application names'),
      hosts: z.string().optional().describe('Comma-separated hostnames'),
      prefer: z
        .enum(['head', 'tail'])
        .optional()
        .describe('Return oldest (head) or newest (tail) results first'),
      size: z.number().optional().describe('Number of log lines to return (max 10000)'),
      paginationId: z
        .string()
        .optional()
        .describe('Pagination token from a previous response for fetching the next page')
    })
  )
  .output(
    z.object({
      lines: z.array(z.record(z.string(), z.unknown())).describe('Array of log line objects'),
      paginationId: z
        .string()
        .nullable()
        .describe('Pagination token for the next page, null if no more results'),
      count: z.number().describe('Number of log lines returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({
      token: ctx.auth.token
    });

    let result = await client.exportLogs({
      from: ctx.input.from,
      to: ctx.input.to,
      query: ctx.input.query,
      levels: ctx.input.levels,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      prefer: ctx.input.prefer,
      size: ctx.input.size,
      paginationId: ctx.input.paginationId || null
    });

    let lines = result.lines || [];

    return {
      output: {
        lines,
        paginationId: result.pagination_id,
        count: lines.length
      },
      message: `Returned **${lines.length}** log line(s).${result.pagination_id ? ' More results available via pagination.' : ' No more results.'}`
    };
  })
  .build();
