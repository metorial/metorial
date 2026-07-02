import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskOutputSchema = z.object({
  taskId: z.string(),
  name: z.string(),
  projectId: z.string(),
  assigneeIds: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  estimate: z.string().optional(),
  status: z.string().optional()
});

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task within a Clockify project. Tasks can have assignees, estimates, billable status, and custom rates.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the task in'),
      name: z.string().describe('Name of the task'),
      assigneeIds: z
        .array(z.string())
        .optional()
        .describe('Array of user IDs to assign to the task'),
      billable: z.boolean().optional().describe('Whether the task is billable'),
      estimate: z
        .string()
        .optional()
        .describe('Time estimate (e.g., "PT1H30M" for 1 hour 30 minutes)'),
      status: z.enum(['ACTIVE', 'DONE']).optional().describe('Task status')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let task = await client.createTask(ctx.input.projectId, {
      name: ctx.input.name,
      assigneeIds: ctx.input.assigneeIds,
      billable: ctx.input.billable,
      estimate: ctx.input.estimate,
      status: ctx.input.status
    });

    return {
      output: {
        taskId: task.id,
        name: task.name,
        projectId: task.projectId || ctx.input.projectId,
        assigneeIds: task.assigneeIds?.length ? task.assigneeIds : undefined,
        billable: task.billable,
        estimate: task.estimate || undefined,
        status: task.status || undefined
      },
      message: `Created task **${task.name}** in project.`
    };
  })
  .build();

export let updateTask = SlateTool.create(spec, {
  name: 'Update Task',
  key: 'update_task',
  description: `Update an existing task in a Clockify project. Modify name, assignees, billable status, estimate, or status.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the task'),
      taskId: z.string().describe('ID of the task to update'),
      name: z.string().optional().describe('Updated task name'),
      assigneeIds: z.array(z.string()).optional().describe('Updated assignee user IDs'),
      billable: z.boolean().optional().describe('Updated billable status'),
      estimate: z.string().optional().describe('Updated time estimate'),
      status: z.enum(['ACTIVE', 'DONE']).optional().describe('Updated status')
    })
  )
  .output(taskOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let task = await client.updateTask(ctx.input.projectId, ctx.input.taskId, {
      name: ctx.input.name,
      assigneeIds: ctx.input.assigneeIds,
      billable: ctx.input.billable,
      estimate: ctx.input.estimate,
      status: ctx.input.status
    });

    return {
      output: {
        taskId: task.id,
        name: task.name,
        projectId: task.projectId || ctx.input.projectId,
        assigneeIds: task.assigneeIds?.length ? task.assigneeIds : undefined,
        billable: task.billable,
        estimate: task.estimate || undefined,
        status: task.status || undefined
      },
      message: `Updated task **${task.name}**.`
    };
  })
  .build();

export let deleteTask = SlateTool.create(spec, {
  name: 'Delete Task',
  key: 'delete_task',
  description: `Delete a task from a Clockify project.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the task'),
      taskId: z.string().describe('ID of the task to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteTask(ctx.input.projectId, ctx.input.taskId);

    return {
      output: { deleted: true },
      message: `Deleted task **${ctx.input.taskId}** from project.`
    };
  })
  .build();

export let getTasks = SlateTool.create(spec, {
  name: 'Get Tasks',
  key: 'get_tasks',
  description: `List tasks for a project in Clockify. Filter by name or active status. Supports pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list tasks for'),
      name: z.string().optional().describe('Filter by task name'),
      isActive: z.boolean().optional().describe('Filter by active status'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let tasks = await client.getTasks(ctx.input.projectId, {
      name: ctx.input.name,
      'is-active': ctx.input.isActive,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (tasks as any[]).map((t: any) => ({
      taskId: t.id,
      name: t.name,
      projectId: t.projectId || ctx.input.projectId,
      assigneeIds: t.assigneeIds?.length ? t.assigneeIds : undefined,
      billable: t.billable,
      estimate: t.estimate || undefined,
      status: t.status || undefined
    }));

    return {
      output: { tasks: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** tasks.`
    };
  })
  .build();
