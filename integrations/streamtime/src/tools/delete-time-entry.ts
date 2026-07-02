import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description: `Delete a logged time entry by its ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      loggedTimeId: z.number().describe('ID of the time entry to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    await client.deleteLoggedTime(ctx.input.loggedTimeId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted time entry (ID: ${ctx.input.loggedTimeId}).`
    };
  })
  .build();
