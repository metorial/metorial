import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Track the status of an asynchronous operation using its task ID. All create, update, and delete operations return a task ID. Use this to check if an operation has completed, is still processing, or has failed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID returned by a previous asynchronous operation')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      commandType: z
        .string()
        .optional()
        .describe('Type of operation (e.g., subscriptionCreateRequest)'),
      status: z
        .string()
        .optional()
        .describe(
          'Task status (received, processing-in-progress, processing-completed, processing-error)'
        ),
      timestamp: z.string().optional().describe('Task creation timestamp'),
      resourceId: z.number().optional().describe('ID of the created/modified resource'),
      description: z.string().optional().describe('Task description or error message'),
      raw: z.any().describe('Full task details from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let task = await client.getTask(ctx.input.taskId);

    return {
      output: {
        taskId: String(task.taskId || task.id || ctx.input.taskId),
        commandType: task.commandType,
        status: task.status,
        timestamp: task.timestamp,
        resourceId: task.response?.resourceId,
        description: task.description || task.response?.error?.description,
        raw: task
      },
      message: `Task **${ctx.input.taskId}** — status: **${task.status || 'unknown'}**.${task.response?.resourceId ? ` Resource ID: **${task.response.resourceId}**.` : ''}`
    };
  })
  .build();

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List all active and recently completed asynchronous tasks in the account. Useful for monitoring ongoing operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('Task ID'),
            commandType: z.string().optional().describe('Operation type'),
            status: z.string().optional().describe('Task status'),
            timestamp: z.string().optional().describe('Task creation timestamp'),
            description: z.string().optional().describe('Task description')
          })
        )
        .describe('List of tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data = await client.listTasks();
    let rawTasks = data?.tasks || data || [];
    if (!Array.isArray(rawTasks)) rawTasks = [];

    let tasks = rawTasks.map((t: any) => ({
      taskId: String(t.taskId || t.id),
      commandType: t.commandType,
      status: t.status,
      timestamp: t.timestamp,
      description: t.description
    }));

    return {
      output: { tasks },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
