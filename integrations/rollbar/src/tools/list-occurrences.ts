import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapOccurrence } from '../lib/client';
import { spec } from '../spec';

export let listOccurrences = SlateTool.create(spec, {
  name: 'List Occurrences',
  key: 'list_occurrences',
  description: `List individual occurrences (instances) of errors/messages. Can list all occurrences in a project or only those belonging to a specific item.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      itemId: z
        .number()
        .optional()
        .describe(
          'Filter occurrences to a specific item ID. If omitted, returns occurrences across all items.'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Page size, default 20; maximum 5000'),
      lastId: z
        .number()
        .optional()
        .describe('Occurrence ID cursor from the previous page; overrides page')
    })
  )
  .output(
    z.object({
      occurrences: z
        .array(
          z.object({
            occurrenceId: z.string().describe('Unique occurrence ID'),
            occurrenceUuid: z.string().optional().describe('Ingestion UUID'),
            itemId: z.number().optional().describe('Parent item ID'),
            timestamp: z.number().optional().describe('Unix timestamp of the occurrence'),
            level: z.string().optional().describe('Severity level'),
            environment: z.string().optional().describe('Environment name'),
            framework: z.string().optional().describe('Framework'),
            platform: z.string().optional().describe('Platform'),
            language: z.string().optional().describe('Programming language'),
            server: z.any().optional().describe('Server information'),
            body: z.any().optional().describe('Occurrence body with error/message details')
          })
        )
        .describe('List of occurrences'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    const params = { page: ctx.input.page, limit: ctx.input.limit, last_id: ctx.input.lastId };
    const result =
      ctx.input.itemId !== undefined
        ? await client.listItemOccurrences(ctx.input.itemId, params)
        : await client.listOccurrences(params);
    const occurrences = result.result.instances.map(mapOccurrence);

    return {
      output: {
        occurrences,
        page: result.result.page ?? ctx.input.page ?? 1
      },
      message: `Found **${occurrences.length}** occurrences${ctx.input.itemId ? ` for item ${ctx.input.itemId}` : ''}.`
    };
  })
  .build();
