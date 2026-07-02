import { z } from 'zod';

export let attachmentSchema = z.object({
  name: z.string().describe('File name'),
  url: z.string().describe('File URL'),
  kind: z.string().describe('MIME type')
});

export let taskRelationshipsSchema = z.object({
  subtaskIds: z.array(z.string()).describe('Child task IDs'),
  blockerIds: z.array(z.string()).describe('IDs of tasks blocking this task'),
  blockingIds: z.array(z.string()).describe('IDs of tasks this task blocks'),
  duplicateIds: z.array(z.string()).describe('Duplicate task IDs'),
  relatedIds: z.array(z.string()).describe('Related task IDs')
});

export let taskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  htmlUrl: z.string().describe('Link to task in Dart'),
  title: z.string().describe('Task title'),
  parentId: z.string().nullable().describe('Parent task ID'),
  dartboard: z.string().describe('Dartboard (project) name'),
  type: z.string().describe('Task type'),
  status: z.string().describe('Current status'),
  description: z.string().describe('Task description in markdown'),
  assignee: z.string().nullable().describe('Primary assignee name or email'),
  assignees: z.array(z.string()).nullable().describe('All assignees'),
  tags: z.array(z.string()).describe('Tags'),
  priority: z
    .enum(['Critical', 'High', 'Medium', 'Low'])
    .nullable()
    .describe('Priority level'),
  startAt: z.string().nullable().describe('Start date (YYYY-MM-DD)'),
  dueAt: z.string().nullable().describe('Due date (YYYY-MM-DD)'),
  size: z.union([z.string(), z.number()]).nullable().describe('Size/estimate'),
  timeTracking: z.string().optional().describe('Time tracked (HH:MM:SS)'),
  attachments: z.array(attachmentSchema).optional().describe('File attachments'),
  customProperties: z
    .record(z.string(), z.any())
    .nullable()
    .optional()
    .describe('Custom property values keyed by property name'),
  taskRelationships: taskRelationshipsSchema.nullable().optional().describe('Related tasks'),
  createdBy: z.string().nullable().optional().describe('Creator name or email'),
  createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)'),
  updatedBy: z.string().nullable().optional().describe('Last updater name or email'),
  updatedAt: z.string().optional().describe('Last update timestamp (ISO 8601)')
});

export let conciseTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  htmlUrl: z.string().describe('Link to task in Dart'),
  title: z.string().describe('Task title'),
  parentId: z.string().nullable().optional().describe('Parent task ID'),
  dartboard: z.string().describe('Dartboard (project) name'),
  type: z.string().optional().describe('Task type'),
  status: z.string().describe('Current status'),
  assignee: z.string().nullable().optional().describe('Primary assignee'),
  assignees: z.array(z.string()).nullable().optional().describe('All assignees'),
  tags: z.array(z.string()).optional().describe('Tags'),
  priority: z
    .enum(['Critical', 'High', 'Medium', 'Low'])
    .nullable()
    .optional()
    .describe('Priority'),
  startAt: z.string().nullable().optional().describe('Start date'),
  dueAt: z.string().nullable().optional().describe('Due date'),
  size: z.union([z.string(), z.number()]).nullable().optional().describe('Size/estimate'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let commentSchema = z.object({
  commentId: z.string().describe('Comment ID'),
  parentId: z
    .string()
    .nullable()
    .optional()
    .describe('Parent comment ID for threaded replies'),
  htmlUrl: z.string().optional().describe('Link to comment in Dart'),
  author: z.string().describe('Author name or email'),
  taskId: z.string().describe('Associated task ID'),
  text: z.string().describe('Comment text in markdown')
});

export let docSchema = z.object({
  docId: z.string().describe('Document ID'),
  htmlUrl: z.string().describe('Link to document in Dart'),
  title: z.string().describe('Document title'),
  folder: z.string().describe('Parent folder name'),
  text: z.string().optional().describe('Document content in markdown')
});

export let conciseDocSchema = z.object({
  docId: z.string().describe('Document ID'),
  htmlUrl: z.string().describe('Link to document in Dart'),
  title: z.string().describe('Document title'),
  folder: z.string().describe('Parent folder name')
});

export let assigneeSchema = z.object({
  name: z.string().describe('Assignee name'),
  email: z.string().describe('Assignee email')
});

export let customPropertySchema = z.object({
  name: z.string().describe('Property name'),
  type: z
    .string()
    .describe(
      'Property type (Checkbox, Dates, Multiselect, Number, Select, Status, Text, Time tracking, User)'
    ),
  options: z.array(z.string()).optional().describe('Available options for select/multiselect'),
  format: z.string().optional().describe('Number format (Dollars, Integer, Percentage)'),
  isRange: z.boolean().optional().describe('Whether dates are a range'),
  isMultiple: z.boolean().optional().describe('Whether multiple users can be assigned'),
  statuses: z.array(z.string()).optional().describe('Available statuses for status type')
});

export let workspaceConfigSchema = z.object({
  today: z.string().describe('Current date (YYYY-MM-DD)'),
  userName: z.string().describe('Current user name'),
  userEmail: z.string().describe('Current user email'),
  dartboards: z.array(z.string()).describe('Available dartboard names'),
  folders: z.array(z.string()).describe('Available folder names'),
  types: z.array(z.string()).describe('Available task type names'),
  statuses: z.array(z.string()).describe('Available status names'),
  assignees: z.array(assigneeSchema).describe('Available assignees'),
  tags: z.array(z.string()).describe('Available tags'),
  priorities: z.array(z.string()).describe('Available priority levels'),
  sizes: z.array(z.union([z.string(), z.number()])).describe('Available sizes'),
  customProperties: z.array(customPropertySchema).describe('Custom property definitions')
});

export type Task = z.infer<typeof taskSchema>;
export type ConciseTask = z.infer<typeof conciseTaskSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Doc = z.infer<typeof docSchema>;
export type ConciseDoc = z.infer<typeof conciseDocSchema>;
export type WorkspaceConfig = z.infer<typeof workspaceConfigSchema>;
