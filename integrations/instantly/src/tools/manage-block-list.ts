import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let manageBlockList = SlateTool.create(spec, {
  name: 'Manage Block List',
  key: 'manage_block_list',
  description: `List, add, or remove entries from the email block list. Blocked entries prevent emails from being sent to specific addresses or domains.`,
  instructions: [
    'Use action "list" to view current block list entries.',
    'Use action "add" to add a new email address or domain to the block list.',
    'Use action "remove" to delete a block list entry by its ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform.'),
      entry: z
        .string()
        .optional()
        .describe('Email address or domain to block (for "add" action).'),
      entryId: z
        .string()
        .optional()
        .describe('ID of the block list entry to remove (for "remove" action).'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of entries to return (for "list" action).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('Block list entry ID'),
            entry: z.string().optional().describe('Blocked email or domain'),
            entryType: z.string().optional().describe('Type of entry')
          })
        )
        .optional()
        .describe('List of block list entries (for "list" action)'),
      nextStartingAfter: z.string().nullable().optional().describe('Cursor for next page'),
      addedEntry: z
        .any()
        .optional()
        .describe('Details of the newly added entry (for "add" action)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listBlockListEntries({
        limit: ctx.input.limit,
        startingAfter: ctx.input.startingAfter
      });

      let entries = result.items.map((e: any) => ({
        entryId: e.id,
        entry: e.bl_value,
        entryType:
          e.is_domain === true ? 'domain' : e.is_domain === false ? 'email' : undefined
      }));

      return {
        output: {
          entries,
          nextStartingAfter: result.next_starting_after ?? null,
          success: true
        },
        message: `Found **${entries.length}** block list entries.`
      };
    }

    if (action === 'add' && ctx.input.entry) {
      let result = await client.createBlockListEntry({ entry: ctx.input.entry });
      return {
        output: { addedEntry: result, success: true },
        message: `Added **${ctx.input.entry}** to the block list.`
      };
    }

    if (action === 'remove' && ctx.input.entryId) {
      await client.deleteBlockListEntry(ctx.input.entryId);
      return {
        output: { success: true },
        message: `Removed block list entry ${ctx.input.entryId}.`
      };
    }

    throw invalid('Provide the required fields for the selected action.');
  })
  .build();
