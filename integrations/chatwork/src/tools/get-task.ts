import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description:
    'Retrieves a task by its ID, including its assignee, assigner, deadline, and originating message. Call list_rooms to discover room IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      roomId: z.number().describe('Room ID. Call list_rooms to discover authorized rooms.'),
      taskId: z.number().describe('Task ID returned by get_tasks or create_task')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('Task ID'),
      roomId: z.number().describe('Room ID'),
      messageId: z.string().describe('Message ID for this task'),
      body: z.string().describe('Task description'),
      status: z.string().describe('Task status: open or done'),
      limitTime: z.number().describe('Deadline as Unix timestamp, or 0 if no deadline'),
      limitType: z.string().describe('Deadline type: none, date, or time'),
      assigneeAccountId: z.number().describe('Assignee account ID'),
      assigneeName: z.string().describe('Assignee display name'),
      assignedByAccountId: z.number().describe('Assigner account ID'),
      assignedByName: z.string().describe('Assigner display name')
    })
  )
  .handleInvocation(async ctx => {
    let task = await createClient(ctx.auth).getRoomTask(ctx.input.roomId, ctx.input.taskId);
    return {
      output: {
        taskId: task.task_id,
        roomId: ctx.input.roomId,
        messageId: task.message_id,
        body: task.body,
        status: task.status,
        limitTime: task.limit_time,
        limitType: task.limit_type,
        assigneeAccountId: task.account.account_id,
        assigneeName: task.account.name,
        assignedByAccountId: task.assigned_by_account.account_id,
        assignedByName: task.assigned_by_account.name
      },
      message: `Retrieved task ${task.task_id} from room ${ctx.input.roomId}.`
    };
  })
  .build();
