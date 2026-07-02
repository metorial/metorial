import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users (agents, brokers, admins) in the Follow Up Boss account. Optionally retrieve details for a specific user. Useful for finding user IDs to assign contacts, tasks, or deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Specific user ID to retrieve details for'),
      limit: z.number().optional().describe('Number of results (default 25, max 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          role: z.string().optional(),
          status: z.string().optional(),
          teamId: z.number().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: {
          users: [
            {
              userId: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              status: user.status,
              teamId: user.teamId
            }
          ],
          total: 1
        },
        message: `Retrieved user **${[user.firstName, user.lastName].filter(Boolean).join(' ')}** (ID: ${user.id}).`
      };
    }

    let result = await client.listUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = result.users || [];

    return {
      output: {
        users: users.map((u: any) => ({
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
          status: u.status,
          teamId: u.teamId
        })),
        total: result._metadata?.total
      },
      message: `Found **${users.length}** user(s)${result._metadata?.total ? ` of ${result._metadata.total} total` : ''}.`
    };
  })
  .build();
