import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTasks = SlateTool.create(spec, {
  name: 'Manage Tasks',
  key: 'manage_tasks',
  description: `List, create, get, or edit tasks in Simla.com. Tasks can be assigned to managers and linked to customers or orders. Use the **action** field to specify the operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'edit']).describe('Operation to perform'),
      taskId: z.number().optional().describe('Task ID (for get/edit actions)'),
      filter: z
        .object({
          performers: z.array(z.number()).optional().describe('Filter by performer user IDs'),
          complete: z.boolean().optional().describe('Filter by completion status'),
          dateFrom: z.string().optional().describe('Due date from (YYYY-MM-DD)'),
          dateTo: z.string().optional().describe('Due date to (YYYY-MM-DD)'),
          text: z.string().optional().describe('Filter by task text')
        })
        .optional()
        .describe('Filter criteria (for list action)'),
      page: z.number().optional(),
      limit: z.number().optional(),
      text: z.string().optional().describe('Task description text (for create/edit)'),
      commentary: z.string().optional().describe('Task commentary (for create/edit)'),
      datetime: z.string().optional().describe('Due date and time (YYYY-MM-DD HH:MM:SS)'),
      performerId: z.number().optional().describe('Performer user ID (for create/edit)'),
      complete: z.boolean().optional().describe('Task completion status (for edit)'),
      customerId: z.number().optional().describe('Link task to customer by ID (for create)'),
      orderId: z.number().optional().describe('Link task to order by ID (for create)')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.number().optional(),
            text: z.string().optional(),
            commentary: z.string().optional(),
            datetime: z.string().optional(),
            createdAt: z.string().optional(),
            complete: z.boolean().optional(),
            performerId: z.number().optional(),
            customerId: z.number().optional(),
            orderId: z.number().optional()
          })
        )
        .optional(),
      task: z
        .object({
          taskId: z.number().optional(),
          text: z.string().optional(),
          commentary: z.string().optional(),
          datetime: z.string().optional(),
          createdAt: z.string().optional(),
          complete: z.boolean().optional(),
          performerId: z.number().optional()
        })
        .optional(),
      createdTaskId: z.number().optional(),
      updated: z.boolean().optional(),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    if (ctx.input.action === 'list') {
      let result = await client.getTasks(ctx.input.filter, ctx.input.page, ctx.input.limit);
      let tasks = result.tasks.map(t => ({
        taskId: t.id,
        text: t.text,
        commentary: t.commentary,
        datetime: t.datetime,
        createdAt: t.createdAt,
        complete: t.complete,
        performerId: t.performerId || t.performer,
        customerId: t.customer?.id,
        orderId: t.order?.id
      }));

      return {
        output: {
          tasks,
          totalCount: result.pagination.totalCount,
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPageCount
        },
        message: `Found **${result.pagination.totalCount}** tasks.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.taskId) throw new Error('taskId is required for get action.');
      let t = await client.getTask(ctx.input.taskId);
      return {
        output: {
          task: {
            taskId: t.id,
            text: t.text,
            commentary: t.commentary,
            datetime: t.datetime,
            createdAt: t.createdAt,
            complete: t.complete,
            performerId: t.performerId || t.performer
          }
        },
        message: `Retrieved task **${t.id}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let taskData: Record<string, any> = {};
      if (ctx.input.text) taskData.text = ctx.input.text;
      if (ctx.input.commentary) taskData.commentary = ctx.input.commentary;
      if (ctx.input.datetime) taskData.datetime = ctx.input.datetime;
      if (ctx.input.performerId) taskData.performerId = ctx.input.performerId;
      if (ctx.input.customerId) taskData.customer = { id: ctx.input.customerId };
      if (ctx.input.orderId) taskData.order = { id: ctx.input.orderId };

      let result = await client.createTask(taskData);
      return {
        output: {
          createdTaskId: result.taskId
        },
        message: `Created task **${result.taskId}**.`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.taskId) throw new Error('taskId is required for edit action.');
      let taskData: Record<string, any> = {};
      if (ctx.input.text !== undefined) taskData.text = ctx.input.text;
      if (ctx.input.commentary !== undefined) taskData.commentary = ctx.input.commentary;
      if (ctx.input.datetime !== undefined) taskData.datetime = ctx.input.datetime;
      if (ctx.input.performerId !== undefined) taskData.performerId = ctx.input.performerId;
      if (ctx.input.complete !== undefined) taskData.complete = ctx.input.complete;

      await client.editTask(ctx.input.taskId, taskData);
      return {
        output: {
          updated: true
        },
        message: `Updated task **${ctx.input.taskId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
