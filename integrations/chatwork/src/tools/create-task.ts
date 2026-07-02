import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Creates a task in a chat room and assigns it to one or more members. Optionally set a due date and specify whether the deadline is a date or a specific time.`,
  constraints: [
    'Task body must be at most 65,535 characters.',
    'Rate limited to 10 task creations per 10 seconds per room.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      body: z.string().min(1).max(65535).describe('Task description'),
      assigneeIds: z
        .array(z.number())
        .min(1)
        .describe('Account IDs of users to assign the task to'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date as an ISO 8601 string (e.g., "2024-12-31T23:59:59Z")'),
      limitType: z
        .enum(['none', 'date', 'time'])
        .optional()
        .describe(
          'Type of deadline: "none" (no deadline display), "date" (date only), "time" (date and time)'
        )
    })
  )
  .output(
    z.object({
      taskIds: z.array(z.number()).describe('IDs of the created tasks (one per assignee)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    let limit: number | undefined;
    if (ctx.input.dueDate) {
      limit = Math.floor(new Date(ctx.input.dueDate).getTime() / 1000);
    }

    let result = await client.createTask(ctx.input.roomId, {
      body: ctx.input.body,
      toIds: ctx.input.assigneeIds,
      limit,
      limitType: ctx.input.limitType
    });

    return {
      output: { taskIds: result.task_ids },
      message: `Created ${result.task_ids.length} task(s) in room ${ctx.input.roomId}.`
    };
  })
  .build();
