import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageListEntry = SlateTool.create(spec, {
  name: 'Manage List Entry',
  key: 'manage_list_entry',
  description: `Add or remove entries from email allow/block lists. Lists control which emails or domains can send to or receive from your inboxes. Specify \`direction\` (send or receive) and \`listType\` (allow or block) to target the correct list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the entry'),
      direction: z.enum(['send', 'receive']).describe('Email flow direction'),
      listType: z.enum(['allow', 'block']).describe('Type of list'),
      entry: z.string().describe('Email address or domain to add/remove'),
      reason: z
        .string()
        .optional()
        .describe('Reason for adding the entry (only for add action)')
    })
  )
  .output(
    z.object({
      entry: z.string().optional().describe('The email or domain entry'),
      direction: z.string().optional().describe('Email flow direction'),
      listType: z.string().optional().describe('List type'),
      entryType: z.string().optional().describe('Whether entry is an email or domain'),
      deleted: z.boolean().optional().describe('Whether the entry was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    if (ctx.input.action === 'add') {
      let result = await client.createListEntry(
        ctx.input.direction,
        ctx.input.listType,
        ctx.input.entry,
        ctx.input.reason
      );

      return {
        output: {
          entry: result.entry,
          direction: result.direction,
          listType: result.list_type,
          entryType: result.entry_type
        },
        message: `Added **${result.entry}** to ${ctx.input.direction} ${ctx.input.listType}list.`
      };
    }

    // remove
    await client.deleteListEntry(ctx.input.direction, ctx.input.listType, ctx.input.entry);

    return {
      output: { deleted: true },
      message: `Removed **${ctx.input.entry}** from ${ctx.input.direction} ${ctx.input.listType}list.`
    };
  })
  .build();
