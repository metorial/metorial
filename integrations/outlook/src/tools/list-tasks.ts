import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description: `List tasks from a specific Microsoft To Do task list. Supports filtering and pagination. Returns task summaries with status, due dates, and importance.`,
  instructions: [
    'A **taskListId** is required. Use the **List Task Lists** tool to find available lists.',
    "Use **filter** for OData queries like `status eq 'notStarted'` or `importance eq 'high'`."
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskListId: z.string().describe('The ID of the task list to retrieve tasks from'),
      filter: z.string().optional().describe('OData filter expression'),
      orderby: z.string().optional().describe('OData orderby expression'),
      top: z.number().optional().describe('Maximum number of tasks to return'),
      skip: z.number().optional().describe('Number of tasks to skip for pagination')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          title: z.string().optional(),
          status: z.string().optional(),
          importance: z.string().optional(),
          isReminderOn: z.boolean().optional(),
          dueDateTime: z.string().optional(),
          dueDateTimeZone: z.string().optional(),
          completedDateTime: z.string().optional(),
          createdDateTime: z.string().optional(),
          lastModifiedDateTime: z.string().optional(),
          categories: z.array(z.string()).optional()
        })
      ),
      nextPageAvailable: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTasks(ctx.input.taskListId, {
      filter: ctx.input.filter,
      orderby: ctx.input.orderby,
      top: ctx.input.top || 25,
      skip: ctx.input.skip
    });

    let tasks = result.value.map(t => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      importance: t.importance,
      isReminderOn: t.isReminderOn,
      dueDateTime: t.dueDateTime?.dateTime,
      dueDateTimeZone: t.dueDateTime?.timeZone,
      completedDateTime: t.completedDateTime?.dateTime,
      createdDateTime: t.createdDateTime,
      lastModifiedDateTime: t.lastModifiedDateTime,
      categories: t.categories
    }));

    return {
      output: {
        tasks,
        nextPageAvailable: !!result['@odata.nextLink']
      },
      message: `Found **${tasks.length}** task(s).`
    };
  })
  .build();
