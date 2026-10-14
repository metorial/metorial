import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/task';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve a Habitica task by its ID or alias, including its checklist item IDs, tags, due date, and completion state. Use list_tasks to discover task IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      taskId: z
        .string()
        .describe('Task ID from list_tasks or create_task, or its unique alias')
    })
  )
  .output(z.object({ task: taskOutputSchema.describe('Task details') }))
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient:
        ctx.auth.xClient ??
        (typeof ctx.config.xClient === 'string' ? ctx.config.xClient : undefined)
    });
    let task = await client.getTask(ctx.input.taskId);
    return {
      output: { task: mapTask(task) },
      message: `Retrieved task **${task.text}**`
    };
  })
  .build();
