import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List members in your Memberstack app with cursor-based pagination. Returns member details including email, custom fields, metadata, plan connections, and more. Use **after** and **limit** to paginate through large result sets.`,
  constraints: [
    'Maximum limit is 200 members per request.',
    'Rate limited to 25 requests per second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      after: z
        .number()
        .optional()
        .describe(
          'Pagination cursor. Use the endCursor from a previous response to get the next page.'
        ),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of members to return (1-200). Defaults to 50.'),
      order: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order by creation date. Defaults to ASC.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of members in the app'),
      endCursor: z.number().nullable().describe('Cursor for the next page of results'),
      hasMore: z.boolean().describe('Whether there are more members to fetch'),
      members: z.array(memberSchema).describe('Array of member objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMembers({
      after: ctx.input.after,
      limit: ctx.input.limit,
      order: ctx.input.order
    });

    return {
      output: result,
      message: `Found **${result.totalCount}** total members. Returned **${result.members.length}** members${result.hasMore ? '. More results available.' : '.'}`
    };
  })
  .build();
