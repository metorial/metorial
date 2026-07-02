import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Permanently delete a time entry from Timely. This cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    await client.deleteEvent(ctx.input.eventId);

    return {
      output: { deleted: true },
      message: `Deleted time entry **#${ctx.input.eventId}**.`
    };
  })
  .build();
