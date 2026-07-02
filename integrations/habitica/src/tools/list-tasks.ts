import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.string().describe('Unique ID of the task'),
  type: z.string().describe('Task type: habit, daily, todo, or reward'),
  text: z.string().describe('Title of the task'),
  notes: z.string().optional().describe('Task notes'),
  priority: z.number().optional().describe('Difficulty priority'),
  completed: z
    .boolean()
    .optional()
    .describe('Whether the task is completed (for To-Dos and Dailies)'),
  isDue: z.boolean().optional().describe('Whether the Daily is due today'),
  value: z.number().optional().describe('Task value/score'),
  date: z.string().optional().describe('Due date for To-Dos'),
  tags: z.array(z.string()).optional().describe('Tag IDs applied to the task'),
  checklist: z
    .array(
      z.object({
        checklistItemId: z.string().describe('Checklist item ID'),
        text: z.string().describe('Checklist item text'),
        completed: z.boolean().describe('Whether item is completed')
      })
    )
    .optional()
    .describe('Checklist items'),
  createdAt: z.string().optional().describe('When the task was created'),
  updatedAt: z.string().optional().describe('When the task was last updated')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve the authenticated user's tasks from Habitica. Optionally filter by task type (habits, dailies, todos, rewards).
Returns task details including title, notes, difficulty, completion status, due dates, and checklist items.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['habits', 'dailys', 'todos', 'rewards'])
        .optional()
        .describe('Filter by task type. Use "dailys" for dailies (Habitica API convention)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('List of tasks'),
      count: z.number().describe('Total number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let tasks = await client.getUserTasks(ctx.input.type);

    let mappedTasks = tasks.map((t: Record<string, any>) => ({
      taskId: t.id || t._id,
      type: t.type,
      text: t.text,
      notes: t.notes || undefined,
      priority: t.priority,
      completed: t.completed,
      isDue: t.isDue,
      value: t.value,
      date: t.date || undefined,
      tags: t.tags,
      checklist: t.checklist?.map((c: any) => ({
        checklistItemId: c.id,
        text: c.text,
        completed: c.completed
      })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        tasks: mappedTasks,
        count: mappedTasks.length
      },
      message: `Retrieved **${mappedTasks.length}** task(s)${ctx.input.type ? ` of type **${ctx.input.type}**` : ''}`
    };
  })
  .build();
