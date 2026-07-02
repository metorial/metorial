import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in Habitica. Modify the title, notes, difficulty, due date, repeat schedule, checklist, tags, and other properties.
Only the provided fields will be updated; omitted fields remain unchanged.`,
  instructions: [
    'Provide only the fields you want to change.',
    'Use the task ID returned from list or create operations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to update'),
      text: z.string().optional().describe('New title for the task'),
      notes: z.string().optional().describe('New notes/description'),
      priority: z
        .enum(['0.1', '1', '1.5', '2'])
        .optional()
        .describe('Difficulty: 0.1=Trivial, 1=Easy, 1.5=Medium, 2=Hard'),
      date: z.string().optional().describe('Due date for To-Dos in YYYY-MM-DD format'),
      up: z.boolean().optional().describe('For Habits: enable the + button'),
      down: z.boolean().optional().describe('For Habits: enable the - button'),
      frequency: z
        .enum(['weekly', 'daily', 'monthly', 'yearly'])
        .optional()
        .describe('Frequency for Dailies'),
      everyX: z.number().optional().describe('Repeat every X intervals for Dailies'),
      startDate: z.string().optional().describe('Start date for Dailies in YYYY-MM-DD format'),
      value: z.number().optional().describe('Gold cost for Reward tasks')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the updated task'),
      type: z.string().describe('Task type'),
      text: z.string().describe('Updated title'),
      notes: z.string().optional().describe('Updated notes'),
      priority: z.number().optional().describe('Updated difficulty'),
      updatedAt: z.string().optional().describe('When the task was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let updates: Record<string, any> = {};
    if (ctx.input.text !== undefined) updates.text = ctx.input.text;
    if (ctx.input.notes !== undefined) updates.notes = ctx.input.notes;
    if (ctx.input.priority !== undefined) updates.priority = Number(ctx.input.priority);
    if (ctx.input.date !== undefined) updates.date = ctx.input.date;
    if (ctx.input.up !== undefined) updates.up = ctx.input.up;
    if (ctx.input.down !== undefined) updates.down = ctx.input.down;
    if (ctx.input.frequency !== undefined) updates.frequency = ctx.input.frequency;
    if (ctx.input.everyX !== undefined) updates.everyX = ctx.input.everyX;
    if (ctx.input.startDate !== undefined) updates.startDate = ctx.input.startDate;
    if (ctx.input.value !== undefined) updates.value = ctx.input.value;

    let task = await client.updateTask(ctx.input.taskId, updates);

    return {
      output: {
        taskId: task.id || task._id,
        type: task.type,
        text: task.text,
        notes: task.notes,
        priority: task.priority,
        updatedAt: task.updatedAt
      },
      message: `Updated task **${task.text}**`
    };
  })
  .build();
