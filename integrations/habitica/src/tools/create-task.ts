import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

let checklistItemSchema = z.object({
  text: z.string().describe('Text of the checklist item'),
  completed: z.boolean().optional().describe('Whether the item is completed')
});

let repeatSchema = z
  .object({
    su: z.boolean().optional().describe('Repeat on Sunday'),
    m: z.boolean().optional().describe('Repeat on Monday'),
    t: z.boolean().optional().describe('Repeat on Tuesday'),
    w: z.boolean().optional().describe('Repeat on Wednesday'),
    th: z.boolean().optional().describe('Repeat on Thursday'),
    f: z.boolean().optional().describe('Repeat on Friday'),
    s: z.boolean().optional().describe('Repeat on Saturday')
  })
  .optional()
  .describe('Weekly repeat schedule for Dailies');

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Habitica. Supports all four task types: **Habit**, **Daily**, **To-Do**, and **Reward**.
Configure difficulty, notes, checklists, tags, due dates (To-Dos), repeat schedules (Dailies), and habit scoring directions.`,
  instructions: [
    'For Habits, use the "up" and "down" fields to control which scoring directions are available.',
    'For Dailies, use the "repeat" field to set which days of the week the daily repeats on.',
    'For To-Dos, use "date" to set a due date in YYYY-MM-DD format.',
    'Difficulty is expressed as a priority number: 0.1 (Trivial), 1 (Easy), 1.5 (Medium), 2 (Hard).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z.enum(['habit', 'daily', 'todo', 'reward']).describe('Type of task to create'),
      text: z.string().describe('Title of the task'),
      notes: z.string().optional().describe('Additional notes or description'),
      priority: z
        .enum(['0.1', '1', '1.5', '2'])
        .optional()
        .describe('Difficulty: 0.1=Trivial, 1=Easy, 1.5=Medium, 2=Hard'),
      tags: z.array(z.string()).optional().describe('Array of tag IDs to apply to the task'),
      checklist: z
        .array(checklistItemSchema)
        .optional()
        .describe('Checklist items for the task'),
      date: z.string().optional().describe('Due date for To-Dos in YYYY-MM-DD format'),
      up: z
        .boolean()
        .optional()
        .describe('For Habits: whether the + (positive) button is available'),
      down: z
        .boolean()
        .optional()
        .describe('For Habits: whether the - (negative) button is available'),
      repeat: repeatSchema,
      frequency: z
        .enum(['weekly', 'daily', 'monthly', 'yearly'])
        .optional()
        .describe('Frequency for Dailies'),
      everyX: z
        .number()
        .optional()
        .describe('How often to repeat (e.g., every 2 days). Used with frequency for Dailies'),
      startDate: z.string().optional().describe('Start date for Dailies in YYYY-MM-DD format'),
      value: z.number().optional().describe('Gold cost for Reward tasks')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique ID of the created task'),
      type: z.string().describe('Task type'),
      text: z.string().describe('Title of the task'),
      notes: z.string().optional().describe('Task notes'),
      priority: z.number().optional().describe('Difficulty priority value'),
      createdAt: z.string().optional().describe('When the task was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let taskData: Record<string, any> = {
      type: ctx.input.type,
      text: ctx.input.text
    };

    if (ctx.input.notes !== undefined) taskData.notes = ctx.input.notes;
    if (ctx.input.priority !== undefined) taskData.priority = Number(ctx.input.priority);
    if (ctx.input.tags !== undefined) taskData.tags = ctx.input.tags;
    if (ctx.input.checklist !== undefined) taskData.checklist = ctx.input.checklist;
    if (ctx.input.date !== undefined) taskData.date = ctx.input.date;
    if (ctx.input.up !== undefined) taskData.up = ctx.input.up;
    if (ctx.input.down !== undefined) taskData.down = ctx.input.down;
    if (ctx.input.repeat !== undefined) taskData.repeat = ctx.input.repeat;
    if (ctx.input.frequency !== undefined) taskData.frequency = ctx.input.frequency;
    if (ctx.input.everyX !== undefined) taskData.everyX = ctx.input.everyX;
    if (ctx.input.startDate !== undefined) taskData.startDate = ctx.input.startDate;
    if (ctx.input.value !== undefined) taskData.value = ctx.input.value;

    let task = await client.createTask(taskData);

    return {
      output: {
        taskId: task.id || task._id,
        type: task.type,
        text: task.text,
        notes: task.notes,
        priority: task.priority,
        createdAt: task.createdAt
      },
      message: `Created **${ctx.input.type}** task: **${task.text}**`
    };
  })
  .build();
