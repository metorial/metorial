import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkflow = SlateTool.create(spec, {
  name: 'Create Workflow',
  key: 'create_workflow',
  description: `Create a new workflow in n8n. Provide the workflow name, nodes, connections, and optional settings. The workflow is created in an inactive state by default.`,
  instructions: [
    'Nodes must include at least a trigger node. Each node requires a name, type, typeVersion, and position.',
    'Connections define how nodes are linked. The key is the source node name, and the value maps output types to target nodes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new workflow'),
      nodes: z.array(z.any()).describe('Array of node definitions for the workflow'),
      connections: z
        .any()
        .describe('Object mapping source node names to their output connections'),
      settings: z
        .any()
        .optional()
        .describe('Optional workflow settings (e.g., saveManualExecutions, timezone)')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('ID of the created workflow'),
      name: z.string().describe('Name of the created workflow'),
      active: z.boolean().describe('Whether the workflow is active'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let workflow = await client.createWorkflow({
      name: ctx.input.name,
      nodes: ctx.input.nodes,
      connections: ctx.input.connections,
      settings: ctx.input.settings
    });

    return {
      output: {
        workflowId: String(workflow.id),
        name: workflow.name || '',
        active: workflow.active ?? false,
        createdAt: workflow.createdAt || '',
        updatedAt: workflow.updatedAt || ''
      },
      message: `Created workflow **"${workflow.name}"** with ID **${workflow.id}**.`
    };
  })
  .build();
