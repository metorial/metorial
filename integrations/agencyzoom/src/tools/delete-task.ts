import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete one or more tasks from AgencyZoom. Provide a single task ID or multiple IDs to batch-delete tasks. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskIds: z.array(z.string()).min(1).describe('Array of one or more task IDs to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    if (ctx.input.taskIds.length === 1) {
      await client.deleteTask(ctx.input.taskIds[0]!);
    } else {
      await client.batchDeleteTasks(ctx.input.taskIds);
    }

    return {
      output: { success: true },
      message: `Deleted **${ctx.input.taskIds.length}** task(s).`
    };
  })
  .build();
