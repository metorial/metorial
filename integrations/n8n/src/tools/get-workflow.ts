import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description: `Retrieve a specific workflow by ID, including its full definition with nodes, connections, and settings. Optionally retrieve a specific historical version of the workflow.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to retrieve'),
      versionId: z
        .string()
        .optional()
        .describe('Specific version ID to retrieve. If omitted, returns the current version.')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      name: z.string().describe('Workflow name'),
      active: z.boolean().describe('Whether the workflow is active'),
      nodes: z.array(z.any()).describe('Array of workflow nodes'),
      connections: z.any().describe('Node connections mapping'),
      settings: z.any().optional().describe('Workflow settings'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      tags: z.array(z.any()).optional().describe('Tags associated with the workflow')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let workflow: any;
    if (ctx.input.versionId) {
      workflow = await client.getWorkflowVersion(ctx.input.workflowId, ctx.input.versionId);
    } else {
      workflow = await client.getWorkflow(ctx.input.workflowId);
    }

    return {
      output: {
        workflowId: String(workflow.id),
        name: workflow.name || '',
        active: workflow.active ?? false,
        nodes: workflow.nodes || [],
        connections: workflow.connections || {},
        settings: workflow.settings,
        createdAt: workflow.createdAt || '',
        updatedAt: workflow.updatedAt || '',
        tags: workflow.tags
      },
      message: `Retrieved workflow **"${workflow.name}"** (ID: ${workflow.id}). It has **${(workflow.nodes || []).length}** node(s) and is currently **${workflow.active ? 'active' : 'inactive'}**.`
    };
  })
  .build();
