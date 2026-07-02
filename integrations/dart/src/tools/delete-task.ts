import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Moves a task to the trash in Dart. The task is not permanently deleted and can be restored from the Dart UI.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete (move to trash)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the task was successfully trashed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Task **${ctx.input.taskId}** has been moved to trash.`
    };
  })
  .build();
