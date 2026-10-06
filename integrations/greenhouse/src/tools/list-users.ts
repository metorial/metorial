import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapUser, userOutputSchema } from '../lib/mappers';
import { spec } from '../spec';
export const listUsersTool = SlateTool.create(spec, {
  key: 'list_users',
  name: 'List Users',
  description:
    'List users by exact primary email or one date range. This list does not identify the current authenticated user.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      email: z.string().optional().describe('Filter by the exact primary email address.'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return users created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return users created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return users updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return users updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listUsers(ctx.input);
    return {
      output: {
        users: page.items.map(mapUser),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
