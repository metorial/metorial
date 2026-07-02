import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('Unique task identifier'),
  name: z.string().describe('Task name'),
  projectId: z.string().optional().describe('Project the task belongs to'),
  projectSectionId: z.string().nullable().optional().describe('Project section ID'),
  authorId: z.string().optional().describe('ID of the user who created the task'),
  responsibleId: z
    .string()
    .nullable()
    .optional()
    .describe('ID of the user responsible for the task'),
  createdAt: z.number().optional().describe('Creation timestamp in milliseconds'),
  dueAt: z.number().nullable().optional().describe('Due date timestamp'),
  endedAt: z.number().nullable().optional().describe('Completion timestamp'),
  isFollowed: z.boolean().optional().describe('Whether the task is followed'),
  isAbandoned: z.boolean().optional().describe('Whether the task is abandoned'),
  isAllDay: z.boolean().optional().describe('Whether the due date is all-day'),
  priorityPosition: z
    .number()
    .nullable()
    .optional()
    .describe('Priority position (null if not prioritized)'),
  timeNeeded: z
    .number()
    .nullable()
    .optional()
    .describe('Estimated time needed in milliseconds'),
  timeSpent: z.number().nullable().optional().describe('Time spent in milliseconds'),
  lastModified: z.number().optional().describe('Last modification timestamp')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from Nozbe Teams. Filter by project, responsible user, completion status, priority, and due dates. Supports sorting and pagination.`,
  instructions: [
    'Use projectId to filter tasks within a specific project.',
    'Set endedAt to null to get only open (incomplete) tasks.',
    'Use priorityPosition with ne:null filter via sortBy to get prioritized tasks.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Filter by project ID (or "task_me" for personal tasks)'),
      responsibleId: z
        .string()
        .optional()
        .describe('Filter by the ID of the responsible user'),
      isCompleted: z
        .boolean()
        .optional()
        .describe(
          'Filter by completion status. True for completed tasks, false for open tasks.'
        ),
      isPrioritized: z.boolean().optional().describe('Filter for prioritized tasks only'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort fields, comma-separated. Prefix with - for descending, e.g. "-created_at,name"'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of tasks to return (1-10000, default 100)'),
      offset: z.number().optional().describe('Number of tasks to skip for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: ListParams = {};
    if (ctx.input.projectId) params.project_id = ctx.input.projectId;
    if (ctx.input.responsibleId) params.responsible_id = ctx.input.responsibleId;
    if (ctx.input.sortBy) params.sortBy = ctx.input.sortBy;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    // Filter by completion status
    if (ctx.input.isCompleted === true) {
      params['ended_at[ne]'] = 'null';
    } else if (ctx.input.isCompleted === false) {
      params.ended_at = null;
    }

    // Filter by priority
    if (ctx.input.isPrioritized === true) {
      params['priority_position[ne]'] = 'null';
    }

    let tasks = await client.listTasks(params);

    let mapped = tasks.map((t: any) => ({
      taskId: t.id,
      name: t.name,
      projectId: t.project_id,
      projectSectionId: t.project_section_id,
      authorId: t.author_id,
      responsibleId: t.responsible_id,
      createdAt: t.created_at,
      dueAt: t.due_at,
      endedAt: t.ended_at,
      isFollowed: t.is_followed,
      isAbandoned: t.is_abandoned,
      isAllDay: t.is_all_day,
      priorityPosition: t.priority_position,
      timeNeeded: t.time_needed,
      timeSpent: t.time_spent,
      lastModified: t.last_modified
    }));

    return {
      output: { tasks: mapped },
      message: `Found **${mapped.length}** task(s).`
    };
  })
  .build();
