import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAssistants = SlateTool.create(spec, {
  name: 'List Assistants',
  key: 'list_assistants',
  description: `List voice AI assistants in your Vapi account. Supports pagination and filtering by creation or update timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of assistants to return (default 100)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter for assistants created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter for assistants created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter for assistants updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter for assistants updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      assistants: z
        .array(
          z.object({
            assistantId: z.string().describe('ID of the assistant'),
            name: z.string().optional().describe('Name of the assistant'),
            firstMessage: z.string().optional().describe('First message the assistant says'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of assistants'),
      count: z.number().describe('Number of assistants returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.createdAfter) params.createdAtGt = ctx.input.createdAfter;
    if (ctx.input.createdBefore) params.createdAtLt = ctx.input.createdBefore;
    if (ctx.input.updatedAfter) params.updatedAtGt = ctx.input.updatedAfter;
    if (ctx.input.updatedBefore) params.updatedAtLt = ctx.input.updatedBefore;

    let assistants = await client.listAssistants(params);

    return {
      output: {
        assistants: assistants.map((a: any) => ({
          assistantId: a.id,
          name: a.name,
          firstMessage: a.firstMessage,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt
        })),
        count: assistants.length
      },
      message: `Found **${assistants.length}** assistant(s).`
    };
  })
  .build();
