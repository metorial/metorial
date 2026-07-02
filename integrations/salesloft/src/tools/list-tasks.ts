import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('SalesLoft task ID'),
  subject: z.string().nullable().optional().describe('Task subject'),
  taskType: z.string().nullable().optional().describe('Task type'),
  status: z.string().nullable().optional().describe('Task status'),
  currentState: z.string().nullable().optional().describe('Current task state'),
  dueDate: z.string().nullable().optional().describe('Due date'),
  description: z.string().nullable().optional().describe('Task description'),
  completed: z.boolean().nullable().optional().describe('Whether the task is completed'),
  completedAt: z.string().nullable().optional().describe('Completion timestamp'),
  personId: z.number().nullable().optional().describe('Associated person ID'),
  userId: z.number().nullable().optional().describe('Assigned user ID'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapTask = (raw: any) => ({
  taskId: raw.id,
  subject: raw.subject,
  taskType: raw.task_type,
  status: raw.status,
  currentState: raw.current_state,
  dueDate: raw.due_date,
  description: raw.description,
  completed: raw.completed,
  completedAt: raw.completed_at,
  personId: raw.person?.id ?? null,
  userId: raw.user?.id ?? null,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in SalesLoft. Filter by person, task type, or current user assignment. Includes both cadence-generated tasks and manually created ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      personId: z.number().optional().describe('Filter by associated person ID'),
      currentUser: z
        .boolean()
        .optional()
        .describe('Filter to tasks assigned to the current user'),
      taskType: z.string().optional().describe('Filter by task type')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('List of tasks'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTasks(ctx.input);
    let tasks = result.data.map(mapTask);

    return {
      output: {
        tasks,
        paging: result.metadata.paging
      },
      message: `Found **${tasks.length}** tasks (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Fetch a single task from SalesLoft by ID. Returns task details including subject, type, status, due date, and assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to fetch')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let task = await client.getTask(ctx.input.taskId);
    let output = mapTask(task);

    return {
      output,
      message: `Fetched task **${output.subject || 'Untitled'}** (ID: ${output.taskId}).`
    };
  })
  .build();
