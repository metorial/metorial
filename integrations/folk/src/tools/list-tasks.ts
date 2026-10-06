import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursorFrom } from '../lib/client';
import { combinatorSchema, filterSchema, taskSchema } from '../lib/schemas';
import { spec } from '../spec';
export const listTasks = SlateTool.create(spec, {
  key: 'list_tasks',
  name: 'List Tasks',
  description:
    'Lists current Folk tasks with cursor pagination and documented filters. Tasks replace reminders and track explicit completion rather than automatic reminder triggers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Whole number of results per page, 1-100; default 20.'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from nextCursor; keep the same filters for subsequent pages.'),
      filter: filterSchema,
      combinator: combinatorSchema,
      onlyAssignedToMe: z
        .boolean()
        .optional()
        .describe('When true, return only tasks assigned to the authenticated user.')
    })
  )
  .output(z.object({ tasks: z.array(taskSchema), nextCursor: z.string().nullable() }))
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listTasks(ctx.input);
    return {
      output: { tasks: result.items, nextCursor: nextCursorFrom(result.pagination.nextLink) },
      message: `Found ${result.items.length} tasks.`
    };
  })
  .build();
