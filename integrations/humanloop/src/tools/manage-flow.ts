import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFlow = SlateTool.create(spec, {
  name: 'Manage Flow',
  key: 'manage_flow',
  description: `Create, update, retrieve, or delete flows. Flows are orchestrations of Prompts, Tools, and other code — enabling evaluation and improvement of complete multi-step AI pipelines. Each flow version is identified by its attributes.`,
  tags: {
    destructive: false,
    readOnly: false
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listFlows({
        page: ctx.input.page,
        size: ctx.input.size
      });
      return {
        output: { flows: result.records, total: result.total },
        message: `Found **${result.total}** flows.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.flowId) throw new Error('flowId is required for get action');
      let flow = await client.getFlow(ctx.input.flowId);
      return {
        output: { flow },
        message: `Retrieved flow **${flow.name || flow.path}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.flowId) body.id = ctx.input.flowId;
      if (ctx.input.attributes) body.attributes = ctx.input.attributes;
      if (ctx.input.versionName) body.version_name = ctx.input.versionName;
      if (ctx.input.versionDescription)
        body.version_description = ctx.input.versionDescription;

      let flow = await client.upsertFlow(body);
      return {
        output: { flow },
        message: `Created/updated flow **${flow.name || flow.path}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.flowId) throw new Error('flowId is required for update action');
      let body: Record<string, any> = {};
      if (ctx.input.path) body.path = ctx.input.path;
      if (ctx.input.name) body.name = ctx.input.name;
      let flow = await client.updateFlow(ctx.input.flowId, body);
      return {
        output: { flow },
        message: `Updated flow **${flow.name || flow.path}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.flowId) throw new Error('flowId is required for delete action');
      await client.deleteFlow(ctx.input.flowId);
      return {
        output: {},
        message: `Deleted flow **${ctx.input.flowId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
