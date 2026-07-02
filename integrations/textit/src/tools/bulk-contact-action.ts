import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bulkContactAction = SlateTool.create(spec, {
  name: 'Bulk Contact Action',
  key: 'bulk_contact_action',
  description: `Perform bulk actions on multiple contacts at once. Supports adding/removing contacts to/from groups, blocking, unblocking, archiving, restoring, interrupting, or deleting contacts.`,
  instructions: [
    'The "add" and "remove" actions require a groupUuid to specify which group to add/remove contacts from.',
    'Contacts are identified by their UUIDs.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactUuids: z
        .array(z.string())
        .describe('List of contact UUIDs to perform the action on'),
      action: z
        .enum([
          'add',
          'remove',
          'block',
          'unblock',
          'archive',
          'restore',
          'interrupt',
          'delete'
        ])
        .describe('The bulk action to perform'),
      groupUuid: z
        .string()
        .optional()
        .describe('Group UUID (required for "add" and "remove" actions)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.performContactAction({
      contacts: ctx.input.contactUuids,
      action: ctx.input.action,
      group: ctx.input.groupUuid
    });

    return {
      output: { success: true },
      message: `Successfully performed **${ctx.input.action}** on **${ctx.input.contactUuids.length}** contact(s).`
    };
  })
  .build();
