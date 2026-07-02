import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve tasks from FreeAgent. Tasks are billable activities that belong to projects and can have timeslips logged against them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['all', 'active', 'completed', 'hidden'])
        .optional()
        .describe('Filter tasks by status'),
      sort: z
        .enum([
          'name',
          '-name',
          'project',
          '-project',
          'billing_rate',
          '-billing_rate',
          'created_at',
          '-created_at',
          'updated_at',
          '-updated_at'
        ])
        .optional()
        .describe('Sort order'),
      projectId: z.string().optional().describe('Filter by project ID'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      tasks: z.array(z.record(z.string(), z.any())).describe('List of task records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let tasks = await client.listTasks(ctx.input);
    let count = tasks.length;

    return {
      output: { tasks },
      message: `Found **${count}** task${count !== 1 ? 's' : ''}.`
    };
  })
  .build();

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task within a FreeAgent project. Tasks define billable activities that can have timeslips logged against them.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to create the task in'),
      name: z.string().describe('Task name'),
      isBillable: z.boolean().optional().describe('Whether the task is billable'),
      billingRate: z.string().optional().describe('Billing rate for this task'),
      billingPeriod: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Billing period')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.any()).describe('The newly created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let taskData: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.isBillable !== undefined) taskData.is_billable = ctx.input.isBillable;
    if (ctx.input.billingRate) taskData.billing_rate = ctx.input.billingRate;
    if (ctx.input.billingPeriod) taskData.billing_period = ctx.input.billingPeriod;

    let task = await client.createTask(ctx.input.projectId, taskData);

    return {
      output: { task },
      message: `Created task **${ctx.input.name}** in project **${ctx.input.projectId}**`
    };
  })
  .build();
