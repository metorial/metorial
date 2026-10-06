import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let manageDirectory = SlateTool.create(spec, {
  name: 'Manage Directory',
  key: 'manage_directory',
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
      directoryId: z
        .string()
        .optional()
        .describe('Directory ID (required for get, update, delete)'),
      path: z.string().optional().describe('Path for the directory (used for create)'),
      parentId: z.string().optional().describe('Parent directory ID (for create or move)'),
      name: z.string().optional().describe('New name for the directory (for update)')
    })
  )
  .output(
    z.object({
      directory: z
        .any()
        .optional()
        .describe('Directory details with subdirectories and files'),
      directories: z.array(z.any()).optional().describe('List of all directories')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
