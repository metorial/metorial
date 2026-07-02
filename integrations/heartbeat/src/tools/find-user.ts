import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('User ID'),
  email: z.string().describe('User email'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  roleId: z.string().describe('Role ID'),
  groups: z.array(z.string()).nullable().describe('Group IDs the user belongs to'),
  createdAt: z.string().describe('When the user was created'),
  bio: z.string().optional().describe('User bio'),
  status: z.string().optional().describe('User status')
});

export let findUser = SlateTool.create(spec, {
  name: 'Find User',
  key: 'find_user',
  description: `Finds a user in your Heartbeat community by email address or retrieves a specific user by ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to search for'),
      userId: z.string().optional().describe('User ID to look up directly')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('Matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: {
          users: [
            {
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              roleId: user.roleId,
              groups: user.groups,
              createdAt: user.createdAt,
              bio: user.bio,
              status: user.status
            }
          ]
        },
        message: `Found user **${user.firstName} ${user.lastName}** (${user.email}).`
      };
    }

    if (ctx.input.email) {
      let result = await client.findUserByEmail(ctx.input.email);
      let users = result.data.map(u => ({
        userId: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        roleId: u.roleId,
        groups: u.groups,
        createdAt: u.createdAt,
        bio: u.bio,
        status: u.status
      }));
      return {
        output: { users },
        message:
          users.length > 0
            ? `Found ${users.length} user(s) matching email **${ctx.input.email}**.`
            : `No users found with email **${ctx.input.email}**.`
      };
    }

    return {
      output: { users: [] },
      message: 'No search criteria provided. Please provide an email or userId.'
    };
  })
  .build();
