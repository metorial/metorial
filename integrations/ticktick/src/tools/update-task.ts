import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checklistItemSchema, mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in TickTick. Modify any combination of title, content, due dates, priority, tags, subtasks, recurrence, and reminders. Both the task ID and project ID are required.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      projectId: z.string().describe('ID of the project the task belongs to'),
      title: z.string().optional().describe('New task title'),
      content: z.string().optional().describe('New task description/content'),
      desc: z.string().optional().describe('New checklist description'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day task'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      timeZone: z.string().optional().describe('Timezone, e.g. "America/Los_Angeles"'),
      priority: z
        .enum(['none', 'low', 'medium', 'high'])
        .optional()
        .describe('Task priority level'),
      reminders: z
        .array(z.string())
        .optional()
        .describe('Reminder triggers in iCalendar TRIGGER format'),
      repeatFlag: z.string().optional().describe('Recurrence rule in RRULE format'),
      tags: z.array(z.string()).optional().describe('Tags to attach to the task'),
      subtasks: z.array(checklistItemSchema).optional().describe('Subtask/checklist items'),
      sortOrder: z.number().optional().describe('Sort order for display')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let priorityMap: Record<string, number> = {
      none: 0,
      low: 1,
      medium: 3,
      high: 5
    };

    let task = await client.updateTask(ctx.input.taskId, {
      taskId: ctx.input.taskId,
      projectId: ctx.input.projectId,
      title: ctx.input.title ?? '',
      content: ctx.input.content,
      desc: ctx.input.desc,
      isAllDay: ctx.input.isAllDay,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      timeZone: ctx.input.timeZone,
      priority: ctx.input.priority ? priorityMap[ctx.input.priority] : undefined,
      reminders: ctx.input.reminders,
      repeatFlag: ctx.input.repeatFlag,
      tags: ctx.input.tags,
      items: ctx.input.subtasks,
      sortOrder: ctx.input.sortOrder
    });

    return {
      output: mapTask(task),
      message: `Updated task **${task.title}**.`
    };
  })
  .build();
