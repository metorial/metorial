import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportLogs = SlateTool.create(spec, {
  name: 'Export Logs',
  key: 'export_logs',
  description: `Search and export log lines from LogDNA in JSONL format. Filter by time range, search query, hosts, apps, levels, and tags. Supports pagination for large result sets using the v2 API.`,
  instructions: [
    'Both "from" and "to" timestamps are required and should be Unix timestamps in milliseconds.',
    'If paginationId is provided, it will continue fetching from a previous paginated export.'
  ],
  constraints: ['Each request returns up to 10,000 lines when using pagination.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.number().describe('Start time as Unix timestamp in milliseconds'),
      to: z.number().describe('End time as Unix timestamp in milliseconds'),
      query: z.string().optional().describe('Search query string to filter logs'),
      hosts: z.string().optional().describe('Comma-separated list of hosts to filter by'),
      apps: z.string().optional().describe('Comma-separated list of apps to filter by'),
      levels: z
        .string()
        .optional()
        .describe('Comma-separated list of log levels to filter by (e.g., error,warn)'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      size: z.number().optional().describe('Maximum number of log lines to return'),
      prefer: z
        .string()
        .optional()
        .describe('Preference for results format (e.g., "head" or "tail")'),
      paginationId: z
        .string()
        .optional()
        .describe('Pagination ID from a previous export request to continue fetching')
    })
  )
  .output(
    z.object({
      lines: z.string().describe('Exported log lines in JSONL format'),
      paginationId: z
        .string()
        .optional()
        .describe(
          'Pagination ID for fetching the next page of results, if more results are available'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      ingestionKey: ctx.auth.ingestionToken
    });

    let result = await client.exportLogsV2({
      from: ctx.input.from,
      to: ctx.input.to,
      query: ctx.input.query,
      hosts: ctx.input.hosts,
      apps: ctx.input.apps,
      levels: ctx.input.levels,
      tags: ctx.input.tags,
      size: ctx.input.size,
      prefer: ctx.input.prefer,
      paginationId: ctx.input.paginationId
    });

    let lineCount =
      typeof result.lines === 'string'
        ? result.lines.split('\n').filter(l => l.trim()).length
        : 0;

    return {
      output: {
        lines: typeof result.lines === 'string' ? result.lines : JSON.stringify(result.lines),
        paginationId: result.paginationId
      },
      message: `Exported **${lineCount}** log line(s).${result.paginationId ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
