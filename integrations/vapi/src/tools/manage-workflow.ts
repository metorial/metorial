import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description:
    'DEPRECATED — use manage_assistant or manage_squad instead. Vapi retired Workflows on August 18, 2026. This tool is retained for compatibility and no longer performs operations.',
  instructions: [
    'Use manage_assistant for a single assistant or manage_squad for multi-assistant conversations.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      workflowId: z
        .string()
        .optional()
        .describe('Workflow ID (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the workflow'),
      nodes: z
        .array(z.any())
        .optional()
        .describe(
          'Array of workflow nodes, each with model, transcriber, voice, tools, and prompt configuration'
        ),
      edges: z
        .array(z.any())
        .optional()
        .describe('Array of edges connecting nodes with conditions'),
      globalPrompt: z.string().optional().describe('Global prompt applied across all nodes')
    })
  )
  .output(
    z.object({
      workflowId: z.string().optional().describe('ID of the workflow'),
      name: z.string().optional().describe('Name of the workflow'),
      nodes: z.any().optional().describe('Workflow nodes'),
      edges: z.any().optional().describe('Workflow edges'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the workflow was deleted')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Vapi retired Workflows on August 18, 2026. Use manage_assistant or manage_squad instead.'
    );
  })
  .build();
