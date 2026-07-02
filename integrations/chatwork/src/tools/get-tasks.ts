import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('Task ID'),
  body: z.string().describe('Task description'),
  status: z.string().describe('Task status: open or done'),
  limitTime: z.number().describe('Due date as Unix timestamp (0 if no deadline)'),
  limitType: z.string().describe('Deadline type: none, date, or time'),
  assigneeAccountId: z.number().optional().describe('Assignee account ID'),
  assigneeName: z.string().optional().describe('Assignee name'),
  assignedByAccountId: z.number().describe('Assigner account ID'),
  assignedByName: z.string().describe('Assigner name'),
  roomId: z.number().optional().describe('Room ID (only for personal task list)'),
  roomName: z.string().optional().describe('Room name (only for personal task list)')
});

export let getTasks = SlateTool.create(spec, {
  name: 'Get Tasks',
  key: 'get_tasks',
  description: `Retrieves tasks either from a specific room or the authenticated user's personal task list across all rooms. Filter by status (open/done) or assigner.`,
  constraints: ['Returns up to 100 tasks.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      roomId: z
        .number()
        .optional()
        .describe(
          'Room ID to get tasks from. Omit to get your personal task list across all rooms.'
        ),
      status: z.enum(['open', 'done']).optional().describe('Filter by task status'),
      assignedByAccountId: z
        .number()
        .optional()
        .describe(
          'Filter by the account ID of the task assigner (only for personal task list)'
        )
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.roomId) {
      let tasks = await client.getRoomTasks(ctx.input.roomId);

      if (ctx.input.status) {
        tasks = tasks.filter(t => t.status === ctx.input.status);
      }

      return {
        output: {
          tasks: tasks.map(t => ({
            taskId: t.task_id,
            body: t.body,
            status: t.status,
            limitTime: t.limit_time,
            limitType: t.limit_type,
            assigneeAccountId: t.account?.account_id,
            assigneeName: t.account?.name,
            assignedByAccountId: t.assigned_by_account.account_id,
            assignedByName: t.assigned_by_account.name
          }))
        },
        message: `Retrieved **${tasks.length}** tasks from room ${ctx.input.roomId}.`
      };
    } else {
      let tasks = await client.getMyTasks({
        status: ctx.input.status,
        assignedByAccountId: ctx.input.assignedByAccountId
      });

      return {
        output: {
          tasks: tasks.map(t => ({
            taskId: t.task_id,
            body: t.body,
            status: t.status,
            limitTime: t.limit_time,
            limitType: t.limit_type,
            assignedByAccountId: t.assigned_by_account.account_id,
            assignedByName: t.assigned_by_account.name,
            roomId: t.room.room_id,
            roomName: t.room.name
          }))
        },
        message: `Retrieved **${tasks.length}** personal tasks.`
      };
    }
  })
  .build();
