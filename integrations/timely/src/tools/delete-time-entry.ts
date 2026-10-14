import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Call list_accounts to choose a workspace when needed. Permanently delete a time entry from Timely. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      eventId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    await client.deleteEvent(ctx.input.eventId);

    return {
      output: { deleted: true },
      message: `Deleted time entry **#${ctx.input.eventId}**.`
    };
  })
  .build();
