import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the noCRM.io account, or retrieve a specific user by ID or email. Returns user details including name, email, role, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Specific user ID or email to retrieve. Omit to list all users.')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          email: z.string().describe('User email'),
          firstname: z.string().optional().describe('First name'),
          lastname: z.string().optional().describe('Last name'),
          isAdmin: z.boolean().optional().describe('Whether user is an admin'),
          isActive: z.boolean().optional().describe('Whether user is active'),
          createdAt: z.string().optional().describe('Account creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let mapUser = (u: any) => ({
      userId: u.id,
      email: u.email,
      firstname: u.firstname,
      lastname: u.lastname,
      isAdmin: u.is_admin,
      isActive: u.is_active,
      createdAt: u.created_at
    });

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: { users: [mapUser(user)] },
        message: `Retrieved user **${user.firstname} ${user.lastname}** (${user.email}).`
      };
    }

    let users = await client.listUsers();
    let mapped = users.map(mapUser);
    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** users.`
    };
  })
  .build();
