import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.number().describe('Task ID'),
  subject: z.string().optional().describe('Task subject'),
  description: z.string().optional().describe('Task description'),
  dueAt: z.string().optional().describe('Due date'),
  done: z.boolean().optional().describe('Completion status'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks in CentralStationCRM with pagination. Returns upcoming and existing tasks across all contacts, deals, and projects.`,
  constraints: ['Maximum 250 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z.enum(['open', 'closed']).optional().describe('Filter by completion state'),
      before: z.string().optional().describe('Only tasks before this date (YYYY-MM-DD)'),
      after: z.string().optional().describe('Only tasks after this date (YYYY-MM-DD)'),
      responsibleUserId: z.number().optional().describe('Assigned user ID from list_users'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 250)')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('List of tasks'),
      count: z.number().describe('Number of tasks returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.listTasks({
      page: ctx.input.page,
      perpage: ctx.input.perPage,
      state: ctx.input.state,
      before: ctx.input.before,
      after: ctx.input.after,
      user_id: ctx.input.responsibleUserId
    });

    let items = Array.isArray(result) ? result : [];
    let tasks = items.map((item: any) => {
      let task = item?.task ?? item;
      return {
        taskId: task.id,
        subject: task.name ?? task.subject,
        description: task.description ?? undefined,
        dueAt: task.precise_time ?? task.due_at ?? undefined,
        done: task.finished ?? task.done,
        createdAt: task.created_at
      };
    });

    return {
      output: {
        tasks,
        count: tasks.length
      },
      message: `Found **${tasks.length}** tasks.`
    };
  })
  .build();
