import { z } from 'zod';

export let taskOutputSchema = z.object({
  taskId: z.string().describe('Task ID'),
  title: z.string().optional().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  state: z.string().optional().describe('Task state'),
  dueAt: z.number().optional().describe('Due date as Unix timestamp'),
  conversationId: z.string().optional().describe('Parent conversation ID'),
  teamId: z.string().optional().describe('Team ID'),
  assignees: z.array(z.object({ userId: z.string(), name: z.string().optional() })).optional(),
  createdAt: z.number().optional(),
  lastActivityAt: z.number().optional()
});

export let mapTask = (task: any) => ({
  taskId: task.id,
  title: task.title ?? undefined,
  description: task.description ?? undefined,
  state: task.state ?? undefined,
  dueAt: task.due_at ?? undefined,
  conversationId:
    typeof task.conversation === 'string' ? task.conversation : task.conversation?.id,
  teamId: typeof task.team === 'string' ? task.team : task.team?.id,
  assignees: task.assignees?.map((user: any) =>
    typeof user === 'string'
      ? { userId: user }
      : { userId: user.id, name: user.name ?? undefined }
  ),
  createdAt: task.created_at ?? undefined,
  lastActivityAt: task.last_activity_at ?? undefined
});
