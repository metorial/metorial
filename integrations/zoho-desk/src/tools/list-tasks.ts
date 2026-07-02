import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks with optional filtering by department and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      departmentId: z.string().optional().describe('Filter by department ID'),
      status: z.string().optional().describe('Filter by status'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of tasks to return')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            subject: z.string().optional().describe('Task subject'),
            status: z.string().optional().describe('Task status'),
            priority: z.string().optional().describe('Task priority'),
            dueDate: z.string().optional().describe('Due date'),
            assigneeId: z.string().optional().describe('Assigned agent ID')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listTasks({
      departmentId: ctx.input.departmentId,
      status: ctx.input.status,
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let tasks = data.map((t: any) => ({
      taskId: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      assigneeId: t.assigneeId
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s)`
    };
  })
  .build();
