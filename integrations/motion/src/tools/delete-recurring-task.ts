import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecurringTask = SlateTool.create(spec, {
  name: 'Delete Recurring Task',
  key: 'delete_recurring_task',
  description: `Permanently delete a recurring task from Motion. This stops future recurrences but does not affect already-created task instances.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      recurringTaskId: z.string().describe('ID of the recurring task to delete')
    })
  )
  .output(
    z.object({
      recurringTaskId: z.string().describe('ID of the deleted recurring task'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    await client.deleteRecurringTask(ctx.input.recurringTaskId);

    return {
      output: {
        recurringTaskId: ctx.input.recurringTaskId,
        deleted: true
      },
      message: `Deleted recurring task \`${ctx.input.recurringTaskId}\``
    };
  })
  .build();
