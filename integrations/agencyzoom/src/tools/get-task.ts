import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieve the full details of an AgencyZoom task, including its status, due date, assignees, and related customer or lead. Use search_tasks to discover task IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ taskId: z.string().describe('Task ID from search_tasks or create_task.') })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.any()).describe('Full task details returned by AgencyZoom.')
    })
  )
  .handleInvocation(async ctx => {
    let task = await new Client(ctx.auth).getTask(ctx.input.taskId);
    return { output: { task }, message: `Retrieved task **${ctx.input.taskId}**.` };
  })
  .build();
