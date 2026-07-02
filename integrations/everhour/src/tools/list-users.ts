import { SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  name: z.string().describe('User full name'),
  headline: z.string().optional().describe('User headline or job title'),
  avatarUrl: z.string().optional().describe('URL of the user avatar'),
  role: z.string().describe('User role: admin, supervisor, or member'),
  status: z.string().describe('User status: active, invited, pending, or removed')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all team members in the Everhour workspace, or retrieve the currently authenticated user's profile. Useful for finding user IDs needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      currentUserOnly: z
        .boolean()
        .optional()
        .describe('If true, only return the authenticated user. Defaults to false.')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);

    if (ctx.input.currentUserOnly) {
      let user = await client.getCurrentUser();
      return {
        output: {
          users: [
            {
              userId: user.id,
              name: user.name,
              headline: user.headline,
              avatarUrl: user.avatarUrl,
              role: user.role,
              status: user.status
            }
          ]
        },
        message: `Retrieved current user: **${user.name}** (${user.role})`
      };
    }

    let users = await client.listTeamUsers();
    let mapped = users.map((u: any) => ({
      userId: u.id,
      name: u.name,
      headline: u.headline,
      avatarUrl: u.avatarUrl,
      role: u.role,
      status: u.status
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** team members.`
    };
  });
