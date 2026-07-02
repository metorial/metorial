import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteReminder = SlateTool.create(spec, {
  name: 'Delete Reminder',
  key: 'delete_reminder',
  description: `Permanently deletes a reminder. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      reminderId: z.string().describe('ID of the reminder to delete')
    })
  )
  .output(
    z.object({
      reminderId: z.string().describe('ID of the deleted reminder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteReminder(ctx.input.reminderId);

    return {
      output: {
        reminderId: result.id
      },
      message: `Deleted reminder ${result.id}`
    };
  })
  .build();
