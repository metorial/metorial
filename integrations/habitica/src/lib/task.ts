import { z } from 'zod';

export let taskOutputSchema = z.object({
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

export let mapTask = (t: Record<string, any>) => ({
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
    checklistItemId: c.id || c._id,
    text: c.text,
    completed: c.completed
  })),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt
});
