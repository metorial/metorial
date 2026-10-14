import { z } from 'zod';
import type { Project, Task } from './client';

export let projectIdSchema = z
  .string()
  .describe('Project ID. Call list_projects to discover accessible project IDs.');

export let checklistItemSchema = z.object({
  id: z
    .string()
    .optional()
    .describe('Existing checklist item ID from get_task; omit for a new item'),
  completedTime: z
    .string()
    .optional()
    .describe('Completion time in yyyy-MM-ddTHH:mm:ssZ format'),
  title: z.string().describe('Subtask title'),
  status: z.number().optional().describe('0 = uncompleted, 1 = completed'),
  isAllDay: z.boolean().optional().describe('Whether this is an all-day subtask'),
  startDate: z.string().optional().describe('Start date in ISO 8601 format'),
  timeZone: z.string().optional().describe('Timezone, e.g. "America/Los_Angeles"'),
  sortOrder: z.number().optional().describe('Display order')
});

export let checklistItemOutputSchema = z.object({
  subtaskId: z.string().describe('Subtask identifier'),
  title: z.string().describe('Subtask title'),
  status: z.number().describe('0 = uncompleted, 1 = completed'),
  completedTime: z.string().optional().describe('Completion timestamp in ISO 8601'),
  isAllDay: z.boolean().optional(),
  sortOrder: z.number().optional(),
  startDate: z.string().optional(),
  timeZone: z.string().optional()
});

export let taskOutputSchema = z.object({
  taskId: z.string().describe('Task identifier'),
  projectId: z.string().describe('Project this task belongs to'),
  title: z.string().describe('Task title'),
  content: z.string().optional().describe('Task description/content'),
  desc: z.string().optional().describe('Checklist description'),
  isAllDay: z.boolean().optional().describe('Whether this is an all-day task'),
  startDate: z.string().optional().describe('Start date in ISO 8601 format'),
  dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
  timeZone: z.string().optional().describe('Timezone'),
  isFloating: z.boolean().optional().describe('Whether time is floating (no timezone)'),
  reminders: z
    .array(z.string())
    .optional()
    .describe('Reminder triggers in iCalendar TRIGGER format'),
  repeatFlag: z.string().optional().describe('Recurrence rule in RRULE format'),
  priority: z.number().describe('Priority: 0 = none, 1 = low, 3 = medium, 5 = high'),
  status: z.number().describe('0 = normal, 2 = completed'),
  completedTime: z.string().optional().describe('Completion timestamp'),
  sortOrder: z.number().optional(),
  items: z.array(checklistItemOutputSchema).optional().describe('Subtask/checklist items'),
  modifiedTime: z.string().optional().describe('Last modified timestamp'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  tags: z.array(z.string()).optional().describe('Tags attached to this task'),
  kind: z.string().optional()
});

export let projectOutputSchema = z.object({
  projectId: z.string().describe('Project identifier'),
  name: z.string().describe('Project name'),
  color: z.string().optional().describe('Hex color code'),
  sortOrder: z.number().optional(),
  closed: z.boolean().optional().describe('Whether the project is archived'),
  groupId: z.string().optional().describe('Parent group/folder ID'),
  viewMode: z.string().optional().describe('View mode: list, kanban, or timeline'),
  permission: z.string().optional().describe('Permission level: read, write, or comment'),
  kind: z.string().optional().describe('Project kind: TASK or NOTE')
});

export let mapTask = (task: Task) => ({
  taskId: task.id,
  projectId: task.projectId,
  title: task.title,
  content: task.content ?? undefined,
  desc: task.desc ?? undefined,
  isAllDay: task.isAllDay ?? undefined,
  startDate: task.startDate ?? undefined,
  dueDate: task.dueDate ?? undefined,
  timeZone: task.timeZone ?? undefined,
  isFloating: task.isFloating ?? undefined,
  reminders: task.reminders ?? undefined,
  repeatFlag: task.repeatFlag ?? undefined,
  priority: task.priority ?? 0,
  status: task.status ?? 0,
  completedTime: task.completedTime ?? undefined,
  sortOrder: task.sortOrder ?? undefined,
  items: task.items?.map(item => ({
    subtaskId: item.id,
    title: item.title,
    status: item.status ?? 0,
    completedTime: item.completedTime ?? undefined,
    isAllDay: item.isAllDay ?? undefined,
    sortOrder: item.sortOrder ?? undefined,
    startDate: item.startDate ?? undefined,
    timeZone: item.timeZone ?? undefined
  })),
  modifiedTime: task.modifiedTime ?? undefined,
  createdTime: task.createdTime ?? undefined,
  tags: task.tags ?? undefined,
  kind: task.kind ?? undefined
});

export let mapProject = (project: Project) => ({
  projectId: project.id,
  name: project.name,
  color: project.color ?? undefined,
  sortOrder: project.sortOrder ?? undefined,
  closed: project.closed ?? undefined,
  groupId: project.groupId ?? undefined,
  viewMode: project.viewMode ?? undefined,
  permission: project.permission ?? undefined,
  kind: project.kind ?? undefined
});
