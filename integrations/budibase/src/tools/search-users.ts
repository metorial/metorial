import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  email: z.string().describe('Email address of the user'),
  firstName: z.string().optional().describe('First name of the user'),
  lastName: z.string().optional().describe('Last name of the user'),
  status: z.string().optional().describe('User status (e.g. "active")'),
  builder: z
    .object({ global: z.boolean().optional() })
    .optional()
    .describe('Builder privileges'),
  admin: z.object({ global: z.boolean().optional() }).optional().describe('Admin privileges'),
  roles: z
    .record(z.string(), z.string())
    .optional()
    .describe('Roles assigned per application (appId -> role)')
});

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search for users in the Budibase tenant. Returns user profiles including their email, roles, and privilege levels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter users by name')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let results = await client.searchUsers({ name: ctx.input.name });

    let users = results.map((user: any) => ({
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      builder: user.builder,
      admin: user.admin,
      roles: user.roles
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s)${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}.`
    };
  })
  .build();
