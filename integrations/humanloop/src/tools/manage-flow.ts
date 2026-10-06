import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let manageFlow = SlateTool.create(spec, {
  name: 'Manage Flow',
  key: 'manage_flow',
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
      action: z
        .enum(['create', 'update', 'get', 'list', 'delete'])
        .describe('Action to perform'),
      flowId: z.string().optional().describe('Flow ID (required for get, update, delete)'),
      path: z
        .string()
        .optional()
        .describe('Path for the flow (e.g. "folder/my-flow"). Used for create.'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Attributes that define this flow version'),
      versionName: z.string().optional().describe('Name for this version'),
      versionDescription: z.string().optional().describe('Description for this version'),
      name: z.string().optional().describe('New name for the flow (for update)'),
      page: z.number().optional().describe('Page number for list action'),
      size: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      flow: z.any().optional().describe('Flow details'),
      flows: z.array(z.any()).optional().describe('List of flows'),
      total: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
