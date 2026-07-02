import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateTaskStatus = SlateTool.create(spec, {
  name: 'Update Task Status',
  key: 'update_task_status',
  description: `Updates the completion status of a task in a chat room. Mark a task as done or reopen it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      taskId: z.number().describe('ID of the task'),
      status: z.enum(['open', 'done']).describe('New task status')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Task ID'),
      status: z.string().describe('Updated task status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.updateTaskStatus(
      ctx.input.roomId,
      ctx.input.taskId,
      ctx.input.status
    );

    return {
      output: {
        taskId: result.task_id,
        status: result.status
      },
      message: `Task ${result.task_id} marked as **${ctx.input.status}**.`
    };
  })
  .build();
