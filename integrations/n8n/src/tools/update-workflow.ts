import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let updateWorkflow = SlateTool.create(spec, {
  name: 'Update Workflow',
  key: 'update_workflow',
  description: `Update an existing workflow's definition, including its name, nodes, connections, and settings. Omitted definition fields are hydrated from a fresh read. Updating a published workflow may re-publish it unless publishIfActive is false. Failures can still leave a saved draft; the read/replace sequence is not atomic.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      expectedVersionId: z
        .string()
        .optional()
        .describe(
          'Refuse if the fresh native version differs. This local preflight is not an atomic concurrency lock.'
        ),
      publishIfActive: z
        .boolean()
        .optional()
        .describe(
          'Current native API option: false saves a draft when already published. Omit to retain native default re-publication behavior; older deployments may not support this option.'
        ),
      workflowId: z.string().describe('ID of the workflow to update'),
      name: z.string().optional().describe('New name for the workflow'),
      nodes: z.array(z.any()).optional().describe('Updated array of node definitions'),
      connections: z.any().optional().describe('Updated connections mapping'),
      settings: z.any().optional().describe('Updated workflow settings')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('ID of the updated workflow'),
      name: z.string().describe('Updated workflow name'),
      active: z.boolean().describe('Whether the workflow is active'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let updatePayload: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
    if (ctx.input.nodes !== undefined) updatePayload.nodes = ctx.input.nodes;
    if (ctx.input.connections !== undefined) updatePayload.connections = ctx.input.connections;
    if (ctx.input.settings !== undefined) updatePayload.settings = ctx.input.settings;

    let workflow = await client.updateWorkflow(ctx.input.workflowId, updatePayload, {
      expectedVersionId: ctx.input.expectedVersionId,
      publishIfActive: ctx.input.publishIfActive
    });

    return {
      output: {
        workflowId: String(workflow.id),
        name: workflow.name || '',
        active: workflow.active ?? false,
        updatedAt: workflow.updatedAt || ''
      },
      message: `Updated workflow **"${workflow.name}"** (ID: ${workflow.id}).`
    };
  })
  .build();
