import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description:
    'Discover users and their external IDs with detailed results. Requires an API key connection.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      emailContains: z
        .string()
        .optional()
        .describe('Optional substring to match against email.'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(50)
        .describe('Maximum number of results, a whole number from 1 to 50.'),
      offset: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe('Number of results to skip, a non-negative whole number.')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Matching users, including stable external IDs and profile details.'),
      count: z.number().describe('Number of results returned in this page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let users = await client.searchUsers({
      properties:
        ctx.input.emailContains !== undefined
          ? [{ property: 'email', operation: 'CONTAINS', value: ctx.input.emailContains }]
          : undefined,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: { users, count: users.length },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
