import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { mapTask, taskOutputSchema } from '../lib/task';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `Retrieve the authenticated user's tasks from Habitica. Optionally filter by task type (habits, dailies, todos, rewards).
Returns task details including title, notes, difficulty, completion status, due dates, and checklist items.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dueDate: z
        .string()
        .optional()
        .describe('Date used to compute whether each Daily is due, in ISO date format'),
      type: z
        .enum(['habits', 'dailys', 'todos', 'rewards'])
        .optional()
        .describe('Filter by task type. Use "dailys" for dailies (Habitica API convention)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskOutputSchema).describe('List of tasks'),
      count: z.number().describe('Total number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient:
        ctx.auth.xClient ??
        (typeof ctx.config.xClient === 'string' ? ctx.config.xClient : undefined)
    });

    let tasks = await client.getUserTasks(ctx.input.type, ctx.input.dueDate);

    let mappedTasks = tasks.map(mapTask);

    return {
      output: {
        tasks: mappedTasks,
        count: mappedTasks.length
      },
      message: `Retrieved **${mappedTasks.length}** task(s)${ctx.input.type ? ` of type **${ctx.input.type}**` : ''}`
    };
  })
  .build();
