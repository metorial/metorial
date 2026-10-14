import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { commentSchema } from '../lib/types';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Lists comments on a specific task. Returns paginated results ordered by publication date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the task to list comments for'),
      limit: z.number().optional().describe('Max results per page'),
      offset: z.number().optional().describe('Pagination offset'),
      ordering: z
        .array(z.string())
        .optional()
        .describe('Ordering fields (e.g., ["-published_at"])')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of comments'),
      next: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Next page URL, or null when there are no more results; use its offset with the same filters'
        ),
      previous: z
        .string()
        .nullable()
        .optional()
        .describe('Previous page URL, or null on the first page'),
      comments: z.array(commentSchema).describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listComments(ctx.input);

    return {
      output: {
        count: result.count,
        next: result.next,
        previous: result.previous,
        comments: result.results
      },
      message: `Found **${result.count}** comment(s) on task **${ctx.input.taskId}**.`
    };
  })
  .build();
