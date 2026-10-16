import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, rawSchema } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  key: 'get_task',
  name: 'Get Import Task',
  description:
    'Check the state of an asynchronous subscriber import using the task ID returned by import_subscribers. Includes import counters and diagnostic links when provided by Doppler.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ taskId: z.string().describe('Task ID returned by import_subscribers') }))
  .output(
    z.object({
      taskId: z.string(),
      taskType: z.string(),
      status: z.string(),
      itemsProcessed: z.number().optional(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    let raw = await client.getTask(ctx.input.taskId);
    return {
      output: {
        taskId: raw.taskId,
        taskType: raw.taskType,
        status: raw.status,
        itemsProcessed: raw.itemsProcessed,
        raw
      },
      message: `Import task is **${raw.status}**.`
    };
  })
  .build();
