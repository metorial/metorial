import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `Create, update, retrieve, or delete a Vapi workflow. Workflows define node-based conversational flows where each node can have its own model, transcriber, voice, tools, and prompt, connected via edges with AI-driven or rule-based conditions.`,
  tags: {
    destructive: false,
    readOnly: false
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
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, workflowId } = ctx.input;

    if (action === 'get') {
      if (!workflowId) throw new Error('workflowId is required for get action');
      let workflow = await client.getWorkflow(workflowId);
      return {
        output: {
          workflowId: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        },
        message: `Retrieved workflow **${workflow.name || workflow.id}**.`
      };
    }

    if (action === 'delete') {
      if (!workflowId) throw new Error('workflowId is required for delete action');
      await client.deleteWorkflow(workflowId);
      return {
        output: { workflowId, deleted: true },
        message: `Deleted workflow **${workflowId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.nodes) body.nodes = ctx.input.nodes;
    if (ctx.input.edges) body.edges = ctx.input.edges;
    if (ctx.input.globalPrompt) body.globalPrompt = ctx.input.globalPrompt;

    if (action === 'create') {
      let workflow = await client.createWorkflow(body);
      return {
        output: {
          workflowId: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        },
        message: `Created workflow **${workflow.name || workflow.id}**.`
      };
    }

    if (action === 'update') {
      if (!workflowId) throw new Error('workflowId is required for update action');
      let workflow = await client.updateWorkflow(workflowId, body);
      return {
        output: {
          workflowId: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes,
          edges: workflow.edges,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt
        },
        message: `Updated workflow **${workflow.name || workflow.id}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
