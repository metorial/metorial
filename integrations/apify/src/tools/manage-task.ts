import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, get, update, delete, list, or run Actor Tasks. Tasks are reusable saved configurations for running Actors with pre-defined input and options.`,
  instructions: [
    'To list tasks, set action to "list".',
    'To get a task, provide taskId with action "get".',
    'To create a task, provide actorId, name, and input with action "create".',
    'To update a task, provide taskId with action "update" and fields to change.',
    'To delete a task, provide taskId with action "delete".',
    'To run a task, provide taskId with action "run". Optionally override input.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'run'])
        .describe('Action to perform'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID or name (required for get/update/delete/run)'),
      actorId: z
        .string()
        .optional()
        .describe('Actor ID to associate with the task (required for create)'),
      name: z.string().optional().describe('Task name (required for create)'),
      title: z.string().optional().describe('Human-readable title'),
      input: z
        .any()
        .optional()
        .describe('Input configuration for the task (for create/update/run)'),
      timeout: z.number().optional().describe('Timeout in seconds (for run)'),
      memory: z.number().optional().describe('Memory in MB (for run, must be power of 2)'),
      build: z.string().optional().describe('Build tag (for run)'),
      limit: z.number().optional().default(25).describe('Max items for list'),
      offset: z.number().optional().default(0).describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID'),
      actorId: z.string().optional().describe('Associated Actor ID'),
      name: z.string().optional().describe('Task name'),
      title: z.string().optional().describe('Task title'),
      input: z.any().optional().describe('Task input configuration'),
      createdAt: z.string().optional().describe('ISO creation timestamp'),
      modifiedAt: z.string().optional().describe('ISO last modification timestamp'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            actorId: z.string().describe('Actor ID'),
            name: z.string().describe('Task name'),
            title: z.string().optional().describe('Task title'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Task list (for list action)'),
      total: z.number().optional().describe('Total tasks (for list action)'),
      runId: z.string().optional().describe('Run ID (for run action)'),
      runStatus: z.string().optional().describe('Run status (for run action)'),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTasks({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let tasks = result.items.map(item => ({
        taskId: item.id,
        actorId: item.actId,
        name: item.name,
        title: item.title,
        createdAt: item.createdAt
      }));

      return {
        output: { tasks, total: result.total },
        message: `Found **${result.total}** task(s), showing **${tasks.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let task = await client.getTask(ctx.input.taskId!);
      return {
        output: {
          taskId: task.id,
          actorId: task.actId,
          name: task.name,
          title: task.title,
          input: task.input,
          createdAt: task.createdAt,
          modifiedAt: task.modifiedAt
        },
        message: `Retrieved task **${task.name}** (\`${task.id}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {
        actId: ctx.input.actorId,
        name: ctx.input.name
      };
      if (ctx.input.title !== undefined) body.title = ctx.input.title;
      if (ctx.input.input !== undefined) body.input = ctx.input.input;

      let task = await client.createTask(body);
      return {
        output: {
          taskId: task.id,
          actorId: task.actId,
          name: task.name,
          title: task.title,
          input: task.input,
          createdAt: task.createdAt,
          modifiedAt: task.modifiedAt
        },
        message: `Created task **${task.name}** (\`${task.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.title !== undefined) body.title = ctx.input.title;
      if (ctx.input.input !== undefined) body.input = ctx.input.input;

      let task = await client.updateTask(ctx.input.taskId!, body);
      return {
        output: {
          taskId: task.id,
          actorId: task.actId,
          name: task.name,
          title: task.title,
          input: task.input,
          createdAt: task.createdAt,
          modifiedAt: task.modifiedAt
        },
        message: `Updated task **${task.name}** (\`${task.id}\`).`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteTask(ctx.input.taskId!);
      return {
        output: { taskId: ctx.input.taskId, deleted: true },
        message: `Deleted task \`${ctx.input.taskId}\`.`
      };
    }

    // run
    let run = await client.runTask(ctx.input.taskId!, {
      input: ctx.input.input,
      timeout: ctx.input.timeout,
      memory: ctx.input.memory,
      build: ctx.input.build
    });

    return {
      output: {
        taskId: ctx.input.taskId,
        runId: run.id,
        runStatus: run.status
      },
      message: `Task \`${ctx.input.taskId}\` run started. Run ID: \`${run.id}\`, Status: **${run.status}**.`
    };
  })
  .build();
