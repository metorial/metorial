import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTask = SlateTool.create(spec, {
  name: 'Get Task',
  key: 'get_task',
  description: `Retrieve a task by ID, or list tasks with pagination. Returns task details including title, status, assignee, and due date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z
        .string()
        .optional()
        .describe('ID of a specific task to retrieve. If omitted, lists tasks.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of tasks per page')
    })
  )
  .output(
    z.object({
      tasks: z.array(z.record(z.string(), z.unknown())).describe('Array of task records'),
      totalCount: z.number().optional().describe('Total number of tasks'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.taskId) {
      let result = await client.getTask(ctx.input.taskId);
      return {
        output: { tasks: [result.data] },
        message: `Retrieved task **${result.data.heading ?? ctx.input.taskId}**.`
      };
    }

    let result = await client.listTasks(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        tasks: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} task(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
