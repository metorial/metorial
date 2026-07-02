import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('ID of the user'),
  fullName: z.string().optional().describe('Full name of the user'),
  email: z.string().optional().describe('Email address of the user'),
  role: z.string().optional().describe('Role of the user in the account')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in your Magnetic account. Returns user details including name, email, and role. Useful for looking up user IDs to assign as task owners or opportunity owners.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users in the account'),
      totalCount: z.number().describe('Number of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagneticClient({ token: ctx.auth.token });

    let results = await client.listUsers();

    let users = (results || []).map((u: any) => ({
      userId: String(u.id),
      fullName: u.fullName,
      email: u.email,
      role: u.role
    }));

    return {
      output: {
        users,
        totalCount: users.length
      },
      message: `Retrieved **${users.length}** user${users.length === 1 ? '' : 's'}.`
    };
  })
  .build();
