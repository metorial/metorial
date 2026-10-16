import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listActivityComments = SlateTool.create(spec, {
  name: 'List Activity Comments',
  key: 'list_activity_comments',
  description:
    'Read one page of activity comments. Requires activity:read, or activity:read_all for Only You activities.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      activityId: exactIdSchema.describe(
        'Activity identifier. Pass IDs beyond 9007199254740991 as exact decimal strings.'
      ),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Comments per page; Strava defaults to 30'),
      afterCursor: z
        .string()
        .optional()
        .describe('Cursor of the last item on the previous page; omit for the first page')
    })
  )
  .output(
    z.object({
      activityIdString: z
        .string()
        .describe('Exact activity identifier supplied in the request'),
      comments: z
        .array(z.any())
        .describe(
          'Complete comments returned by Strava, including their identifiers and athlete data'
        ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let comments = await new Client(ctx.auth).getActivityComments(ctx.input.activityId, {
      pageSize: ctx.input.pageSize,
      afterCursor: ctx.input.afterCursor
    });
    return {
      output: {
        activityIdString: String(ctx.input.activityId),
        comments,
        count: comments.length
      },
      message: `Retrieved ${comments.length} comments.`
    };
  })
  .build();
