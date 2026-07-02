import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Capsule CRM account. Useful for finding user IDs when assigning owners to parties, opportunities, projects, or tasks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            name: z.string().optional().describe('Full name'),
            username: z.string().optional().describe('Email/username'),
            role: z.string().optional().describe('User role (e.g. administrator)'),
            status: z.string().optional().describe('Account status'),
            pictureURL: z.string().optional().describe('Avatar URL')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result = await client.listUsers();

    let users = (result.users || []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      status: u.status,
      pictureURL: u.pictureURL
    }));

    return {
      output: { users },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
