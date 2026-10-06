import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTasks = SlateTool.create(spec, {
  name: 'List Tasks',
  key: 'list_tasks',
  description:
    'List tasks visible to the connected user, with task query filtering and cursor pagination. Managed API keys require tasks:read; reading other users requires workspace permissions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Task expression, for example type:email assignee:Myself status:open sortBy:due sortDir:asc.'
        ),
      limit: z.number().optional().describe('Maximum tasks in one page, from 1 to 500.'),
      cursor: z.string().optional().describe('Opaque cursor from the previous page.'),
      timezone: z.string().optional().describe('IANA timezone for due-date calculations.')
    })
  )
  .output(
    z.object({
      tasks: z.array(
        z.object({
          taskId: z.string(),
          type: z.string().optional(),
          subject: z.string().optional(),
          status: z.string().optional(),
          isCompleted: z.boolean().optional(),
          due: z.string().optional(),
          priority: z.string().optional(),
          assignee: z
            .object({
              id: z.string(),
              name: z.string().optional(),
              email: z.string().optional()
            })
            .optional(),
          sequence: z
            .object({
              id: z.string(),
              name: z.string().optional(),
              stage: z.string().optional()
            })
            .optional()
        })
      ),
      nextCursor: z.string().optional(),
      hasNext: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).listTasks({
      query: ctx.input.query,
      limit: ctx.input.limit,
      next: ctx.input.cursor,
      timezone: ctx.input.timezone
    });
    return {
      output: {
        tasks: data.results.map(({ _id, ...task }) => ({ taskId: _id, ...task })),
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${data.results.length} task(s).`
    };
  })
  .build();
