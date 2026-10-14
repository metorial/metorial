import { z } from 'zod';
import type { BugherdTask } from './types';

export let taskSummarySchema = z.object({
  taskId: z.number().describe('Global task ID'),
  localTaskId: z.number().describe('Project-scoped task ID'),
  projectId: z.number().describe('Project ID the task belongs to'),
  description: z.string().describe('Task description'),
  title: z.string().nullable().describe('Task title'),
  status: z.string().describe('Current task status'),
  priorityId: z
    .number()
    .describe('Priority: 0=not set, 1=critical, 2=important, 3=normal, 4=minor'),
  tagNames: z.array(z.string()).describe('Tags on the task'),
  externalId: z.string().nullable().describe('External tracking ID'),
  assigneeEmail: z.string().nullable().describe('Email of the assignee'),
  requesterEmail: z.string().nullable().describe('Email of the requester'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let mapTaskSummary = (task: BugherdTask) => ({
  taskId: task.id,
  localTaskId: task.local_task_id,
  projectId: task.project_id,
  description: task.description,
  title: task.title ?? null,
  status: task.status,
  priorityId: task.priority_id,
  tagNames: task.tag_names ?? [],
  externalId: task.external_id ?? null,
  assigneeEmail: task.assigned_to?.email ?? null,
  requesterEmail: task.requester_email ?? null,
  createdAt: task.created_at,
  updatedAt: task.updated_at
});
