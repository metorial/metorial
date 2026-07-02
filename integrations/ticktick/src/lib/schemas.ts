import { z } from 'zod';

export let checklistItemSchema = z.object({
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

export let mapTask = (task: any) => ({
  taskId: task.id,
  projectId: task.projectId,
  title: task.title,
  content: task.content,
  desc: task.desc,
  isAllDay: task.isAllDay,
  startDate: task.startDate,
  dueDate: task.dueDate,
  timeZone: task.timeZone,
  isFloating: task.isFloating,
  reminders: task.reminders,
  repeatFlag: task.repeatFlag,
  priority: task.priority ?? 0,
  status: task.status ?? 0,
  completedTime: task.completedTime,
  sortOrder: task.sortOrder,
  items: task.items?.map((item: any) => ({
    subtaskId: item.id,
    title: item.title,
    status: item.status ?? 0,
    completedTime: item.completedTime,
    isAllDay: item.isAllDay,
    sortOrder: item.sortOrder,
    startDate: item.startDate,
    timeZone: item.timeZone
  })),
  modifiedTime: task.modifiedTime,
  createdTime: task.createdTime,
  tags: task.tags,
  kind: task.kind
});

export let mapProject = (project: any) => ({
  projectId: project.id,
  name: project.name,
  color: project.color,
  sortOrder: project.sortOrder,
  closed: project.closed,
  groupId: project.groupId,
  viewMode: project.viewMode,
  permission: project.permission,
  kind: project.kind
});
