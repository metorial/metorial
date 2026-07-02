import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateWorkflow = SlateTool.create(spec, {
  name: 'Update Workflow',
  key: 'update_workflow',
  description: `Update an existing workflow's definition, including its name, nodes, connections, and settings. If the workflow is currently active, it will be automatically reactivated with the new definition.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let updatePayload: Record<string, any> = {};
    if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
    if (ctx.input.nodes !== undefined) updatePayload.nodes = ctx.input.nodes;
    if (ctx.input.connections !== undefined) updatePayload.connections = ctx.input.connections;
    if (ctx.input.settings !== undefined) updatePayload.settings = ctx.input.settings;

    let workflow = await client.updateWorkflow(ctx.input.workflowId, updatePayload);

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
