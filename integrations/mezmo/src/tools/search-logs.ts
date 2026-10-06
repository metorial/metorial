import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { logFilterSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchLogs = SlateTool.create(spec, {
  name: 'Search Logs',
  key: 'search_logs',
  description: `Search and export log lines from Mezmo using the Export API v2. Supports filtering by query, time range, log levels, applications, and hosts. Returns results in JSON format with pagination support for large result sets.`,
  instructions: [
    'Time range accepts Unix timestamps in seconds or milliseconds.',
    'Pass "0" for "from" to use the retention boundary, or "0" for "to" to use the current time.',
    'Use paginationId from the previous response and retain exactly the same time range, filters, order and size. For pagination, prefer fixed timestamps over relative 0 bounds.'
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
    logFilterSchema.extend({
      paginationId: z
        .string()
        .optional()
        .describe('Next-page token; retain the exact original range, filters, order and size')
    })
  )
  .output(
    z.object({
      lines: z.array(z.record(z.string(), z.unknown())).describe('Array of log line objects'),
      paginationId: z
        .string()
        .nullable()
        .describe('Pagination token for the next page, null if no more results'),
      returnedCount: z.number().describe('Number of log lines returned in this page'),
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

    let lines = result.lines;

    return {
      output: {
        lines,
        paginationId: result.pagination_id,
        count: lines.length,
        returnedCount: lines.length
      },
      message: `Returned **${lines.length}** log line(s).${result.pagination_id ? ' More results available via pagination.' : ' No more results.'}`
    };
  })
  .build();
