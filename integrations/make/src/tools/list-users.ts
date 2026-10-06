import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging } from '../lib/schemas';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a bounded page of users for a team or organization. Returns user profiles including name, email, and last login information.`,
  tags: {
    readOnly: true
  },
  instructions: ['Provide either organizationId or teamId to filter users.']
})
  .input(
    z.object({
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID from list_organizations; provide exactly one container'),
      teamId: z
        .number()
        .optional()
        .describe('Team ID from list_teams; provide exactly one teamId or organizationId'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      offset: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          name: z.string().optional().describe('User name'),
          email: z.string().optional().describe('User email'),
          language: z.string().optional().describe('User language'),
          lastLogin: z.string().optional().describe('Last login timestamp'),
          avatar: z.string().optional().describe('Avatar URL')
        })
      ),
      page: paging.optional(),
      total: z.number().optional().describe('Total number of users')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listUsers(ctx.input);
    const users = result.users.map(u => ({
      userId: u.id,
      name: u.name ?? undefined,
      email: u.email ?? undefined,
      language: u.language ?? undefined,
      lastLogin: u.lastLogin ?? undefined,
      avatar: u.avatar ?? undefined
    }));
    return {
      output: { users, page: result.pg },
      message: `Returned ${users.length} users in this page.`
    };
  })
  .build();
