import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLogs = SlateTool.create(spec, {
  name: 'Manage Logs',
  key: 'manage_logs',
  description: `List, retrieve, or delete LLM call logs. Logs capture every prompt call or LLM response, including inputs, outputs, latencies, token counts, and costs. Supports filtering by version, date range, and text search. Use this for observability and debugging of your AI applications.`,
  instructions: [
    'A fileId (prompt, tool, flow, etc.) is required when listing logs.',
    'Use search to filter logs by content in inputs/outputs.',
    'Date filters use ISO 8601 format (e.g. "2024-01-01T00:00:00Z").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'delete']).describe('Action to perform'),
      logId: z.string().optional().describe('Log ID (required for get)'),
      logIds: z.array(z.string()).optional().describe('Log IDs (required for delete)'),
      fileId: z.string().optional().describe('File ID to list logs for (required for list)'),
      versionId: z.string().optional().describe('Filter logs by version ID'),
      search: z.string().optional().describe('Search text in inputs/outputs'),
      startDate: z.string().optional().describe('Start date filter (ISO 8601)'),
      endDate: z.string().optional().describe('End date filter (ISO 8601)'),
      page: z.number().optional().describe('Page number'),
      size: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      log: z.any().optional().describe('Log details'),
      logs: z.array(z.any()).optional().describe('List of logs'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      if (!ctx.input.fileId) throw new Error('fileId is required for list action');
      let result = await client.listLogs(ctx.input.fileId, {
        page: ctx.input.page,
        size: ctx.input.size,
        versionId: ctx.input.versionId,
        search: ctx.input.search,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      });
      return {
        output: { logs: result.records, total: result.total },
        message: `Found **${result.total}** logs for file **${ctx.input.fileId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.logId) throw new Error('logId is required for get action');
      let log = await client.getLog(ctx.input.logId);
      return {
        output: { log },
        message: `Retrieved log **${ctx.input.logId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.logIds?.length) throw new Error('logIds is required for delete action');
      await client.deleteLogs(ctx.input.logIds);
      return {
        output: {},
        message: `Deleted **${ctx.input.logIds.length}** log(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
