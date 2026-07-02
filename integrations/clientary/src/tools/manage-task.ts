import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.number().describe('Unique ID of the task'),
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  complete: z.boolean().optional().describe('Whether the task is complete'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  assigneeId: z.number().optional().describe('Staff member ID assigned to the task'),
  projectId: z.number().optional().describe('Associated project ID'),
  clientId: z.number().optional().describe('Associated client ID'),
  completedAt: z.string().optional().describe('Completion timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in Clientary. Tasks can optionally be assigned to a project and/or staff member.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Task title (required)'),
      description: z.string().optional().describe('Task description'),
      projectId: z.number().optional().describe('Project ID to associate with'),
      assigneeId: z.number().optional().describe('Staff member ID to assign to'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = { title: ctx.input.title };
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.projectId) data.project_id = ctx.input.projectId;
    if (ctx.input.assigneeId) data.assignee_id = ctx.input.assigneeId;
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;

    let result = await client.createTask(data);
    let t = result.task || result;

    return {
      output: mapTask(t),
      message: `Created task **"${t.title}"** (ID: ${t.id}).`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task. Can modify title, description, assignment, completion status, and due date.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to update'),
      title: z.string().optional().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      complete: z.boolean().optional().describe('Mark as complete or incomplete'),
      projectId: z.number().optional().describe('Project ID'),
      assigneeId: z.number().optional().describe('Staff member ID to assign'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.complete !== undefined) data.complete = ctx.input.complete;
    if (ctx.input.projectId !== undefined) data.project_id = ctx.input.projectId;
    if (ctx.input.assigneeId !== undefined) data.assignee_id = ctx.input.assigneeId;
    if (ctx.input.dueDate !== undefined) data.due_date = ctx.input.dueDate;

    let result = await client.updateTask(ctx.input.taskId, data);
    let t = result.task || result;

    return {
      output: mapTask(t),
      message: `Updated task **"${t.title}"** (ID: ${t.id}).`
    };
  })
  .build();

export let getTasks = SlateTool.create(spec, {
  name: 'Get Tasks',
  key: 'get_tasks',
  description: `Retrieve a specific task by ID or list tasks with optional project filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z
        .number()
        .optional()
        .describe('ID of a specific task. If omitted, lists tasks.'),
      projectId: z.number().optional().describe('Filter tasks by project ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks'),
      totalCount: z.number().optional().describe('Total number of matching tasks'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.taskId) {
      let result = await client.getTask(ctx.input.taskId);
      let t = result.task || result;
      return {
        output: { tasks: [mapTask(t)] },
        message: `Retrieved task **"${t.title}"** (ID: ${t.id}).`
      };
    }

    let result = await client.listTasks({
      page: ctx.input.page,
      projectId: ctx.input.projectId
    });

    let tasks = (result.tasks || []).map(mapTask);

    return {
      output: {
        tasks,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${tasks.length} task(s).`
    };
  })
  .build();

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteTask(ctx.input.taskId);

    return {
      output: { success: true },
      message: `Deleted task ID ${ctx.input.taskId}.`
    };
  })
  .build();

let mapTask = (t: any) => ({
  taskId: t.id,
  title: t.title,
  description: t.description,
  complete: t.complete,
  dueDate: t.due_date,
  assigneeId: t.assignee_id,
  projectId: t.project_id,
  clientId: t.client_id,
  completedAt: t.completed_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});
