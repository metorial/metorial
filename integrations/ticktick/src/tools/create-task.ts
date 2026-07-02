import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { checklistItemSchema, mapTask, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in TickTick. Tasks can include subtasks (checklist items), reminders, recurrence rules, due dates, tags, and priority levels. If no project is specified, the task is added to the inbox.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Task title'),
      content: z.string().optional().describe('Task description/content'),
      desc: z.string().optional().describe('Checklist description'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to add the task to. Omit to add to inbox'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day task'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format, e.g. "2024-01-15T09:00:00+0000"'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
      timeZone: z.string().optional().describe('Timezone, e.g. "America/Los_Angeles"'),
      priority: z
        .enum(['none', 'low', 'medium', 'high'])
        .optional()
        .describe('Task priority level'),
      reminders: z
        .array(z.string())
        .optional()
        .describe('Reminder triggers in iCalendar TRIGGER format, e.g. "TRIGGER:P0DT9H0M0S"'),
      repeatFlag: z
        .string()
        .optional()
        .describe('Recurrence rule in RRULE format, e.g. "RRULE:FREQ=DAILY;INTERVAL=1"'),
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

    let task = await client.createTask({
      title: ctx.input.title,
      content: ctx.input.content,
      desc: ctx.input.desc,
      projectId: ctx.input.projectId,
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
      message: `Created task **${task.title}**${task.projectId ? ` in project \`${task.projectId}\`` : ' in inbox'}.`
    };
  })
  .build();
