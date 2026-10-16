import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: 'List workspace user logins, roles, and email addresses for ticket assignment.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userUuid: z
        .string()
        .optional()
        .describe('Filter by workspace user UUID when available.'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque nextCursor from the previous response; keep the same filters.')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          email: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          role: z.string(),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth.token);
    const result = await client.listUsers({
      uuid: ctx.input.userUuid,
      cursor: ctx.input.cursor
    });
    return {
      output: {
        users: result.results.map(item => ({
          email: item.email,
          firstName: item.first_name,
          lastName: item.last_name,
          role: item.role,
          createdOn: item.created_on
        })),
        hasMore: result.next !== null,
        nextCursor: client.nextCursor(result),
        raw: result
      },
      message: `Found **${result.results.length}** users.`
    };
  })
  .build();
