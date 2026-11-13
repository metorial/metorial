import { z } from 'zod';

export let completionTimestampSchema = z.iso.datetime({ offset: true });

export let taskCompletedOutputSchema = z.object({
  accountId: z.string().min(1).describe('ID of the connected Google account'),
  taskListId: z.string().min(1).describe('ID of the task list containing the task'),
  taskListTitle: z.string().optional(),
  taskId: z.string().min(1).describe('ID of the completed task'),
  title: z.string().optional(),
  status: z.literal('completed'),
  completed: completionTimestampSchema.describe('Completion time reported by Google'),
  updated: z.string().optional().describe('Last modification time reported by Google'),
  hidden: z.boolean().optional(),
  webViewLink: z.string().optional(),
  links: z
    .array(
      z.object({
        type: z.string().optional(),
        description: z.string().optional(),
        link: z.string().optional()
      })
    )
    .optional(),
  observedAt: completionTimestampSchema.describe('Time the polling observation began')
});

export let taskCompletedEventSchema = taskCompletedOutputSchema.extend({
  type: z.literal('task.completed')
});

export type TaskCompletedEvent = z.infer<typeof taskCompletedEventSchema>;

export let taskCompletionId = (event: z.infer<typeof taskCompletedOutputSchema>) =>
  JSON.stringify([
    'task.completed',
    event.accountId,
    event.taskListId,
    event.taskId,
    event.completed
  ]);
