import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadLists = SlateTool.create(spec, {
  name: 'Manage Lead Lists',
  key: 'manage_lead_lists',
  description: `List, create, update, or delete lead lists. Lead lists organize leads into groups that can be associated with campaigns or used independently.`,
  instructions: [
    'Use action "list" to view all lead lists with optional search.',
    'Use action "create" to add a new lead list.',
    'Use action "update" to rename an existing lead list.',
    'Use action "delete" to remove a lead list.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform.'),
      listId: z
        .string()
        .optional()
        .describe('ID of the lead list (for "update" and "delete" actions).'),
      name: z
        .string()
        .optional()
        .describe('Name for the lead list (for "create" and "update" actions).'),
      search: z.string().optional().describe('Search lead lists by name (for "list" action).'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of lists to return (for "list" action).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Lead list ID'),
            name: z.string().optional().describe('List name'),
            hasEnrichmentTask: z
              .boolean()
              .optional()
              .describe('Whether enrichment task exists'),
            timestampCreated: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Lead lists (for "list" action)'),
      nextStartingAfter: z.string().nullable().optional().describe('Cursor for next page'),
      list: z.any().optional().describe('Created or updated lead list details'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listLeadLists({
        limit: ctx.input.limit,
        startingAfter: ctx.input.startingAfter,
        search: ctx.input.search
      });

      let lists = result.items.map((l: any) => ({
        listId: l.id,
        name: l.name,
        hasEnrichmentTask: l.has_enrichment_task,
        timestampCreated: l.timestamp_created
      }));

      return {
        output: {
          lists,
          nextStartingAfter: result.next_starting_after,
          success: true
        },
        message: `Found **${lists.length}** lead list(s).`
      };
    }

    if (action === 'create' && ctx.input.name) {
      let result = await client.createLeadList(ctx.input.name);
      return {
        output: { list: result, success: true },
        message: `Created lead list **${ctx.input.name}**.`
      };
    }

    if (action === 'update' && ctx.input.listId && ctx.input.name) {
      let result = await client.updateLeadList(ctx.input.listId, ctx.input.name);
      return {
        output: { list: result, success: true },
        message: `Updated lead list ${ctx.input.listId}.`
      };
    }

    if (action === 'delete' && ctx.input.listId) {
      await client.deleteLeadList(ctx.input.listId);
      return {
        output: { success: true },
        message: `Deleted lead list ${ctx.input.listId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Missing required parameters for the specified action.'
    };
  })
  .build();
