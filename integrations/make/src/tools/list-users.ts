import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users for a team or organization. Returns user profiles including name, email, and last login information.`,
  tags: {
    readOnly: true
  },
  instructions: ['Provide either organizationId or teamId to filter users.']
})
  .input(
    z.object({
      organizationId: z.number().optional().describe('Filter users by organization ID'),
      teamId: z.number().optional().describe('Filter users by team ID'),
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
      total: z.number().optional().describe('Total number of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listUsers({
      organizationId: ctx.input.organizationId,
      teamId: ctx.input.teamId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let users = (result.users ?? result ?? []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      language: u.language,
      lastLogin: u.lastLogin,
      avatar: u.avatar
    }));

    return {
      output: {
        users,
        total: result.pg?.total
      },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
