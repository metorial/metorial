import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  jsonObjectSchema,
  mapRun,
  paginationInput,
  pickDefined,
  requireString,
  validateRunOptions
} from './shared';

let taskOutput = (task: Record<string, any>) => ({
  taskId: task.id,
  actorId: task.actId,
  name: task.name,
  title: task.title,
  input: task.input,
  options: task.options ?? undefined,
  createdAt: task.createdAt,
  modifiedAt: task.modifiedAt
});

let taskOptions = (params: { timeout?: number; memory?: number; build?: string }) => {
  validateRunOptions(params);
  let options = pickDefined({
    timeoutSecs: params.timeout,
    memoryMbytes: params.memory,
    build: params.build
  });
  return Object.keys(options).length > 0 ? options : undefined;
};

export let manageTask = SlateTool.create(spec, {
  name: 'Manage Task',
  key: 'manage_task',
  description: `Create, get, update, delete, list, or run Apify Actor Tasks. Tasks save reusable Actor input and run options.`,
  instructions: [
    'Use action=create with actorId and name to save a reusable task.',
    'Use action=run with taskId to start a run from saved task settings.',
    'Run options on action=run override saved task options for that run only.'
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
      taskId: z.string().optional().describe('Task ID or name for get/update/delete/run'),
      actorId: z.string().optional().describe('Actor ID; required for create'),
      name: z.string().optional().describe('Task name; required for create'),
      title: z.string().optional().describe('Human-readable title'),
      input: z.any().optional().describe('Saved task input or per-run input override'),
      timeout: z.number().optional().describe('Run timeout in seconds'),
      memory: z.number().optional().describe('Run memory in MB; must be a power of 2'),
      build: z.string().optional().describe('Build tag or number'),
      waitForFinish: z.number().optional().describe('Seconds to wait before returning run'),
      maxItems: z.number().optional().describe('Maximum dataset items for a run'),
      maxTotalChargeUsd: z.number().optional().describe('Maximum total charge in USD'),
      restartOnError: z.boolean().optional().describe('Whether Apify should restart on error'),
      webhooks: z.array(jsonObjectSchema).optional().describe('Ad-hoc webhooks for a run'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      taskId: z.string().optional().describe('Task ID'),
      actorId: z.string().optional().describe('Associated Actor ID'),
      name: z.string().optional().describe('Task name'),
      title: z.string().optional().describe('Task title'),
      input: z.any().optional().describe('Task input'),
      options: z.record(z.string(), z.any()).optional().describe('Task run options'),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      tasks: z.array(z.record(z.string(), z.any())).optional().describe('Task list'),
      total: z.number().optional().describe('Total tasks'),
      runId: z.string().optional().describe('Run ID when action=run'),
      runStatus: z.string().optional().describe('Run status when action=run'),
      defaultDatasetId: z.string().optional(),
      defaultKeyValueStoreId: z.string().optional(),
      defaultRequestQueueId: z.string().optional(),
      deleted: z.boolean().optional().describe('Whether the task was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTasks({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending
      });
      let tasks = result.items.map(taskOutput);
      return {
        output: { tasks, total: result.total },
        message: `Found **${result.total}** task(s), showing **${tasks.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let taskId = requireString(ctx.input.taskId, 'taskId', 'get');
      let task = await client.getTask(taskId);
      return {
        output: taskOutput(task),
        message: `Retrieved task **${task.name ?? taskId}** (\`${task.id ?? taskId}\`).`
      };
    }

    if (ctx.input.action === 'create') {
      let actorId = requireString(ctx.input.actorId, 'actorId', 'create');
      let name = requireString(ctx.input.name, 'name', 'create');
      let body = pickDefined({
        actId: actorId,
        name,
        title: ctx.input.title,
        input: ctx.input.input,
        options: taskOptions(ctx.input)
      });
      let task = await client.createTask(body);
      return {
        output: taskOutput(task),
        message: `Created task **${task.name ?? name}** (\`${task.id}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      let taskId = requireString(ctx.input.taskId, 'taskId', 'update');
      let body = pickDefined({
        name: ctx.input.name,
        title: ctx.input.title,
        input: ctx.input.input,
        options: taskOptions(ctx.input)
      });
      ensureAtLeastOne(body, 'update the task');
      let task = await client.updateTask(taskId, body);
      return {
        output: taskOutput(task),
        message: `Updated task **${task.name ?? taskId}** (\`${task.id ?? taskId}\`).`
      };
    }

    if (ctx.input.action === 'delete') {
      let taskId = requireString(ctx.input.taskId, 'taskId', 'delete');
      await client.deleteTask(taskId);
      return {
        output: { taskId, deleted: true },
        message: `Deleted task \`${taskId}\`.`
      };
    }

    let taskId = requireString(ctx.input.taskId, 'taskId', 'run');
    validateRunOptions(ctx.input);
    let run = await client.runTask(taskId, {
      input: ctx.input.input,
      timeout: ctx.input.timeout,
      memory: ctx.input.memory,
      build: ctx.input.build,
      waitForFinish: ctx.input.waitForFinish,
      maxItems: ctx.input.maxItems,
      maxTotalChargeUsd: ctx.input.maxTotalChargeUsd,
      restartOnError: ctx.input.restartOnError,
      webhooks: ctx.input.webhooks
    });
    let mapped = mapRun(run);

    return {
      output: {
        taskId,
        runId: mapped.runId,
        runStatus: mapped.status,
        defaultDatasetId: mapped.defaultDatasetId,
        defaultKeyValueStoreId: mapped.defaultKeyValueStoreId,
        defaultRequestQueueId: mapped.defaultRequestQueueId
      },
      message: `Task \`${taskId}\` run started. Run ID: \`${mapped.runId}\`, status: **${mapped.status}**.`
    };
  })
  .build();
