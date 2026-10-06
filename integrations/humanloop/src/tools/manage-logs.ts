import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let manageLogs = SlateTool.create(spec, {
  name: 'Manage Logs',
  key: 'manage_logs',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
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
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
