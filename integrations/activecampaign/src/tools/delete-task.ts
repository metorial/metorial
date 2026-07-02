import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: 'Deletes a deal task from ActiveCampaign.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    await client.deleteTask(ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Task (ID: ${ctx.input.taskId}) has been deleted.`
    };
  })
  .build();
