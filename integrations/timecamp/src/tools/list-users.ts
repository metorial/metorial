import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in the TimeCamp account. Returns user details including email, display name, and role information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          email: z.string().describe('User email address'),
          displayName: z.string().describe('User display name'),
          roleId: z.string().describe('Role identifier'),
          groupId: z.string().describe('Group identifier')
        })
      ),
      totalUsers: z.number().describe('Total number of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let users = await client.getUsers();

    let mapped = (users || []).map(u => ({
      userId: String(u.user_id),
      email: u.email || '',
      displayName: u.display_name || '',
      roleId: String(u.role_id || ''),
      groupId: String(u.group_id || '')
    }));

    return {
      output: {
        users: mapped,
        totalUsers: mapped.length
      },
      message: `Retrieved **${mapped.length}** users.`
    };
  })
  .build();
