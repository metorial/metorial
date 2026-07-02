import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('Task ID (e.g., "ev:9876543210")'),
  name: z.string().describe('Task name'),
  projects: z.array(z.string()).optional().describe('Project IDs this task belongs to'),
  section: z.number().optional().describe('Section ID'),
  labels: z.array(z.string()).optional().describe('Task labels'),
  description: z.string().optional().describe('Task description'),
  dueAt: z.string().optional().describe('Due date'),
  status: z.string().optional().describe('Task status: open or closed'),
  position: z.number().optional().describe('Task position in the list'),
  time: z.any().optional().describe('Tracked time totals'),
  estimate: z.any().optional().describe('Task estimate')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in a project, or search for tasks globally or within a project. Use the search query to find tasks by name.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID to list tasks from. Required unless using global search.'),
      query: z.string().optional().describe('Search query to filter tasks by name'),
      excludeClosed: z.boolean().optional().describe('If true, exclude closed tasks'),
      searchInClosed: z
        .boolean()
        .optional()
        .describe('If true, include closed tasks in search results'),
      limit: z.number().optional().describe('Maximum number of tasks to return (max 250)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let tasks: any[];

    if (ctx.input.query && !ctx.input.projectId) {
      tasks = await client.searchTasks({
        query: ctx.input.query,
        limit: ctx.input.limit,
        searchInClosed: ctx.input.searchInClosed
      });
    } else if (ctx.input.query && ctx.input.projectId) {
      tasks = await client.searchTasksInProject(ctx.input.projectId, {
        query: ctx.input.query,
        limit: ctx.input.limit,
        searchInClosed: ctx.input.searchInClosed
      });
    } else if (ctx.input.projectId) {
      tasks = await client.listTasks(ctx.input.projectId, {
        page: ctx.input.page,
        limit: ctx.input.limit,
        'exclude-closed': ctx.input.excludeClosed
      });
    } else {
      tasks = await client.searchTasks({ limit: ctx.input.limit });
    }

    let mapped = tasks.map((t: any) => ({
      taskId: t.id,
      name: t.name,
      projects: t.projects,
      section: t.section,
      labels: t.labels,
      description: t.description,
      dueAt: t.dueAt,
      status: t.status,
      position: t.position,
      time: t.time,
      estimate: t.estimate
    }));

    return {
      output: { tasks: mapped },
      message: `Found **${mapped.length}** task(s).`
    };
  });

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve detailed information about a specific task including time tracked and estimates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID (e.g., "ev:9876543210")')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let t = await client.getTask(ctx.input.taskId);
    return {
      output: {
        taskId: t.id,
        name: t.name,
        projects: t.projects,
        section: t.section,
        labels: t.labels,
        description: t.description,
        dueAt: t.dueAt,
        status: t.status,
        position: t.position,
        time: t.time,
        estimate: t.estimate
      },
      message: `Retrieved task **${t.name}** (${t.status}).`
    };
  });

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task in a project. Optionally assign it to a section, set labels, due date, and description.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to create the task in'),
      name: z.string().describe('Task name'),
      section: z.number().optional().describe('Section ID to place the task in'),
      labels: z.array(z.string()).optional().describe('Labels to assign'),
      description: z.string().optional().describe('Task description'),
      dueOn: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      position: z.number().optional().describe('Position in the task list')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { projectId, ...taskData } = ctx.input;
    let t = await client.createTask(projectId, taskData);
    return {
      output: {
        taskId: t.id,
        name: t.name,
        projects: t.projects,
        section: t.section,
        labels: t.labels,
        description: t.description,
        dueAt: t.dueAt,
        status: t.status,
        position: t.position,
        time: t.time,
        estimate: t.estimate
      },
      message: `Created task **${t.name}** (${t.id}).`
    };
  });

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update a task's name, section, labels, description, due date, status, position, or estimate. Set estimate fields to configure time estimates; set removeEstimate to true to clear them.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to update'),
      name: z.string().optional().describe('New task name'),
      section: z.number().optional().describe('Move task to this section ID'),
      labels: z.array(z.string()).optional().describe('Updated labels'),
      description: z.string().optional().describe('Updated description'),
      dueOn: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
      status: z.enum(['open', 'closed']).optional().describe('Set task status'),
      position: z.number().optional().describe('Updated position'),
      estimate: z
        .object({
          total: z.number().describe('Total estimate in seconds'),
          type: z.enum(['overall']).describe('Estimate type'),
          users: z
            .record(z.string(), z.number())
            .optional()
            .describe('Per-user estimates (user ID -> seconds)')
        })
        .optional()
        .describe('Set a time estimate'),
      removeEstimate: z.boolean().optional().describe('Set to true to remove the estimate')
    })
  )
  .output(taskSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { taskId, estimate, removeEstimate, ...updateData } = ctx.input;

    if (Object.keys(updateData).length > 0) {
      await client.updateTask(taskId, updateData);
    }

    if (removeEstimate) {
      await client.removeTaskEstimate(taskId);
    } else if (estimate) {
      await client.setTaskEstimate(taskId, estimate);
    }

    let t = await client.getTask(taskId);
    return {
      output: {
        taskId: t.id,
        name: t.name,
        projects: t.projects,
        section: t.section,
        labels: t.labels,
        description: t.description,
        dueAt: t.dueAt,
        status: t.status,
        position: t.position,
        time: t.time,
        estimate: t.estimate
      },
      message: `Updated task **${t.name}**.`
    };
  });

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Permanently delete a task from Everhour.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteTask(ctx.input.taskId);
    return {
      output: { success: true },
      message: `Deleted task ${ctx.input.taskId}.`
    };
  });
