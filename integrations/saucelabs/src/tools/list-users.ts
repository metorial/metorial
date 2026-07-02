import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('User UUID'),
  username: z.string().optional().describe('Username'),
  email: z.string().optional().describe('Email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  isActive: z.boolean().optional().describe('Whether the user account is active'),
  roles: z
    .array(
      z.object({
        role: z.number().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('User roles'),
  teams: z
    .array(
      z.object({
        teamId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Teams the user belongs to')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users in your Sauce Labs organization. Filter by username, team, role, or account status. Useful for managing team membership and user access.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      username: z.string().optional().describe('Filter by username'),
      teams: z.string().optional().describe('Filter by team ID'),
      roles: z
        .string()
        .optional()
        .describe('Filter by role (1=member, 3=team_admin, 4=org_admin)'),
      status: z.string().optional().describe('Filter by account status (active, inactive)'),
      limit: z.number().optional().describe('Maximum number of users to return (max 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users'),
      totalCount: z.number().optional().describe('Total matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listUsers({
      username: ctx.input.username,
      teams: ctx.input.teams,
      roles: ctx.input.roles,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let usersRaw = result.users ?? [];
    let users = usersRaw.map((u: any) => ({
      userId: u.id,
      username: u.username,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      isActive: u.is_active,
      roles: u.roles?.map((r: any) => ({ role: r.role, name: r.name })),
      teams: u.teams?.map((t: any) => ({ teamId: t.id, name: t.name }))
    }));

    return {
      output: { users, totalCount: result.total_users ?? users.length },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
