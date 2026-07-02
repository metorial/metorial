import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      itemId: z
        .number()
        .optional()
        .describe(
          'Filter occurrences to a specific item ID. If omitted, returns occurrences across all items.'
        ),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      occurrences: z
        .array(
          z.object({
            occurrenceId: z.string().describe('Unique occurrence ID'),
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
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.itemId) {
      result = await client.listItemOccurrences(ctx.input.itemId, { page: ctx.input.page });
    } else {
      result = await client.listOccurrences({ page: ctx.input.page });
    }

    let instances = result?.result?.instances || [];
    let occurrences = instances.map((occ: any) => ({
      occurrenceId: occ.id,
      itemId: occ.item_id,
      timestamp: occ.timestamp,
      level: occ.level_string || occ.level,
      environment: occ.data?.environment,
      framework: occ.data?.framework,
      platform: occ.data?.platform,
      language: occ.data?.language,
      server: occ.data?.server,
      body: occ.data?.body
    }));

    return {
      output: {
        occurrences,
        page: ctx.input.page || 1
      },
      message: `Found **${occurrences.length}** occurrences${ctx.input.itemId ? ` for item ${ctx.input.itemId}` : ''}.`
    };
  })
  .build();
