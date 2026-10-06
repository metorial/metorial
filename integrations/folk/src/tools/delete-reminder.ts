import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteReminder = SlateTool.create(spec, {
  name: 'Delete Reminder',
  key: 'delete_reminder',
  description: `DEPRECATED — use manage_task for current task workflows. Permanently deletes a reminder. This action cannot be undone.`,
  instructions: [
    'Prefer manage_task; reminder endpoints sunset in February 2027. Existing reminder IDs must still use reminder tools.'
  ],
  tags: {
    deprecated: true,
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
