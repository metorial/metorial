import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const exportInputSchema = z.object({
  from: z
    .number()
    .describe('Start Unix time in seconds or milliseconds; zero means retention boundary'),
  to: z.number().describe('End Unix time in seconds or milliseconds; zero means current time'),
  query: z.string().optional().describe('Search query string to filter logs'),
  hosts: z.string().optional().describe('Comma-separated list of hosts to filter by'),
  apps: z.string().optional().describe('Comma-separated list of apps to filter by'),
  levels: z
    .string()
    .optional()
    .describe('Comma-separated list of log levels to filter by (e.g., error,warn)'),
  tags: z
    .string()
    .optional()
    .describe('Legacy unsupported parameter; use a tag condition in query'),
  size: z.number().optional().describe('Maximum lines for this page, from 1 to 10000'),
  prefer: z
    .string()
    .optional()
    .describe('Ordering: head selects the first matching lines, tail the last'),
  paginationId: z
    .string()
    .optional()
    .describe('Returned next-page token; repeat every other export parameter unchanged')
});

export let exportLogs = SlateTool.create(spec, {
  name: 'Export Logs',
  key: 'export_logs',
  description:
    'DEPRECATED — use `download_log_export` instead. Search and export log lines from LogDNA in the legacy inline JSONL format. Supports the v2 API continuation token.',
  instructions: [
    'Use download_log_export for a downloadable JSONL page. This tool retains the legacy inline result.',
    'The legacy handler uses service-key authentication at api.logdna.com. Use download_log_export for IAM tokens or a different account API host.',
    'Both "from" and "to" timestamps are required; Unix seconds or milliseconds are supported.',
    'Keep the range, filters, ordering, and size identical when continuing with paginationId.'
  ],
  constraints: ['Each request returns up to 10,000 lines when using pagination.'],
  tags: {
    deprecated: true,
    destructive: false,
    readOnly: true
  }
})
  .input(exportInputSchema)
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

export let downloadLogExport = SlateTool.create(spec, {
  name: 'Download Log Export',
  key: 'download_log_export',
  description:
    'Download one JSONL page of matching LogDNA logs. Use the returned paginationId with the same time range, filters, preference, and size to request the next page.',
  instructions: [
    'Keep every export parameter unchanged when following paginationId. The provider limits each page to 10000 lines.',
    'Zero from/to values use the retention boundary/current time. Use fixed timestamps for a stable export window.',
    'The tags field is retained for compatibility but unsupported by the current export endpoint; use a tag condition in query.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(exportInputSchema)
  .output(
    z.object({
      filename: z.string().describe('Filename of the downloadable JSONL export page'),
      mimeType: z.string().describe('File content type'),
      lineCount: z.number().describe('Number of lines reported for this page'),
      paginationId: z
        .string()
        .optional()
        .describe('Provider token for the next page; absent on the final page')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    const result = await client.exportLogsV2(ctx.input);
    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.lines, {
        headers: { 'content-type': 'application/x-ndjson' }
      }),
      mimeType: 'application/x-ndjson',
      filename: 'log-export-page.jsonl'
    });
    return {
      output: {
        filename: 'log-export-page.jsonl',
        mimeType: 'application/x-ndjson',
        lineCount: result.lineCount,
        paginationId: result.paginationId
      },
      message: `Prepared a downloadable JSONL export page with **${result.lineCount}** log line(s).${result.paginationId ? ' More results are available.' : ''}`
    };
  })
  .build();
