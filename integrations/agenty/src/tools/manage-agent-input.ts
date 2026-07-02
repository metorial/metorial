import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAgentInput = SlateTool.create(spec, {
  name: 'Manage Agent Input',
  key: 'manage_agent_input',
  description: `Get or update the input configuration of an agent. You can attach manual URLs, link a reusable list, or chain another agent's output as input. Use the "get" action to view current input, or "update" to modify it.`,
  instructions: [
    'To attach manual URLs, set inputType to "manual" and provide urls.',
    'To attach a list, set inputType to "list" and provide sourceId (the list ID) and field (the column name to use as URL source).',
    'To chain another agent, set inputType to "agent" and provide sourceId (source agent ID) and field (field to use as URL source).',
    'Maximum 25,000 URLs per manual input update. For more, use the list approach.'
  ]
})
  .input(
    z.object({
      agentId: z.string().describe('The agent ID to manage input for.'),
      action: z
        .enum(['get', 'update'])
        .describe('"get" to retrieve current input, "update" to modify it.'),
      inputType: z
        .enum(['manual', 'list', 'agent'])
        .optional()
        .describe('Type of input source. Required when action is "update".'),
      urls: z
        .array(z.string())
        .optional()
        .describe('Array of URLs to scrape. Used when inputType is "manual".'),
      sourceId: z
        .string()
        .optional()
        .describe('List ID or source agent ID. Used when inputType is "list" or "agent".'),
      field: z
        .string()
        .optional()
        .describe('Column/field name to use as URL source from the list or agent output.'),
      collection: z.number().optional().describe('Collection index. Defaults to 1.')
    })
  )
  .output(
    z.object({
      type: z.string().describe('Current input type (manual, list, agent, url).'),
      urls: z.array(z.string()).optional().nullable().describe('Array of input URLs.'),
      sourceId: z.string().optional().nullable().describe('Linked list or agent ID.'),
      field: z.string().optional().nullable().describe('Field used as URL source.'),
      collection: z.number().optional().nullable().describe('Collection index.'),
      message: z.string().optional().describe('Status message for update operations.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let result = await client.getInput(ctx.input.agentId);

      return {
        output: {
          type: result.type,
          urls: result.data,
          sourceId: result.id,
          field: result.field,
          collection: result.collection
        },
        message: `Agent **${ctx.input.agentId}** input type: **${result.type}**. ${result.data ? `${result.data.length} URL(s) configured.` : ''}`
      };
    }

    let inputPayload: any = {
      type: ctx.input.inputType,
      collection: ctx.input.collection ?? 1
    };

    if (ctx.input.inputType === 'manual') {
      inputPayload.data = ctx.input.urls || [];
    } else if (ctx.input.inputType === 'list') {
      inputPayload.id = ctx.input.sourceId;
      inputPayload.field = ctx.input.field;
      inputPayload.data = ctx.input.urls || [];
    } else if (ctx.input.inputType === 'agent') {
      inputPayload.id = ctx.input.sourceId;
      inputPayload.field = ctx.input.field;
      inputPayload.data = ctx.input.urls || [];
    }

    let result = await client.updateInput(ctx.input.agentId, inputPayload);

    return {
      output: {
        type: ctx.input.inputType || 'manual',
        urls: ctx.input.urls,
        sourceId: ctx.input.sourceId,
        field: ctx.input.field,
        collection: ctx.input.collection ?? 1,
        message: result.message
      },
      message: `Updated agent **${ctx.input.agentId}** input to type **${ctx.input.inputType}**. ${result.message || ''}`
    };
  })
  .build();
