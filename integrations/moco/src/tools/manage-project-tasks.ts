import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.number().describe('Task ID'),
  projectId: z.number().describe('Parent project ID'),
  name: z.string().describe('Task name'),
  billable: z.boolean().optional().describe('Whether the task is billable'),
  active: z.boolean().optional().describe('Whether the task is active'),
  budget: z.number().optional().describe('Task budget in hours'),
  hourlyRate: z.number().optional().describe('Hourly rate for this task'),
  description: z.string().optional().describe('Task description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapTask = (t: any, projectId: number) => ({
  taskId: t.id,
  projectId,
  name: t.name,
  billable: t.billable,
  active: t.active,
  budget: t.budget,
  hourlyRate: t.hourly_rate,
  description: t.description,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});

export let listProjectTasks = SlateTool.create(spec, {
  name: 'List Project Tasks',
  key: 'list_project_tasks',
  description: `Retrieve all tasks for a specific project. Tasks represent the work categories that time can be logged against.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to list tasks for')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let data = await client.listProjectTasks(ctx.input.projectId);
    let tasks = (data as any[]).map(t => mapTask(t, ctx.input.projectId));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** tasks for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let createProjectTask = SlateTool.create(spec, {
  name: 'Create Project Task',
  key: 'create_project_task',
  description: `Create a new task within a project. Tasks define work categories for time tracking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to create the task in'),
      name: z.string().describe('Task name'),
      billable: z.boolean().optional().describe('Whether the task is billable'),
      active: z.boolean().optional().describe('Whether the task is active'),
      budget: z.number().optional().describe('Task budget in hours'),
      hourlyRate: z.number().optional().describe('Hourly rate for this task'),
      description: z.string().optional().describe('Task description')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.active !== undefined) data.active = ctx.input.active;
    if (ctx.input.budget !== undefined) data.budget = ctx.input.budget;
    if (ctx.input.hourlyRate !== undefined) data.hourly_rate = ctx.input.hourlyRate;
    if (ctx.input.description) data.description = ctx.input.description;

    let t = await client.createProjectTask(ctx.input.projectId, data);

    return {
      output: mapTask(t, ctx.input.projectId),
      message: `Created task **${t.name}** (ID: ${t.id}) in project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let updateProjectTask = SlateTool.create(spec, {
  name: 'Update Project Task',
  key: 'update_project_task',
  description: `Update an existing task within a project.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      taskId: z.number().describe('The task ID to update'),
      name: z.string().optional().describe('New task name'),
      billable: z.boolean().optional().describe('New billable status'),
      active: z.boolean().optional().describe('New active status'),
      budget: z.number().optional().describe('New budget in hours'),
      hourlyRate: z.number().optional().describe('New hourly rate'),
      description: z.string().optional().describe('New task description')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.active !== undefined) data.active = ctx.input.active;
    if (ctx.input.budget !== undefined) data.budget = ctx.input.budget;
    if (ctx.input.hourlyRate !== undefined) data.hourly_rate = ctx.input.hourlyRate;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let t = await client.updateProjectTask(ctx.input.projectId, ctx.input.taskId, data);

    return {
      output: mapTask(t, ctx.input.projectId),
      message: `Updated task **${t.name}** (ID: ${t.id}).`
    };
  })
  .build();

export let deleteProjectTask = SlateTool.create(spec, {
  name: 'Delete Project Task',
  key: 'delete_project_task',
  description: `Delete a task from a project. Only tasks with no tracked hours can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      taskId: z.number().describe('The task ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteProjectTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: { success: true },
      message: `Deleted task **${ctx.input.taskId}** from project **${ctx.input.projectId}**.`
    };
  })
  .build();
