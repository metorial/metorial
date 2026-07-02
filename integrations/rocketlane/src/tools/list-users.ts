import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists users in Rocketlane. Can filter by user type (all, vendor, or customer) and look up a specific user by email or ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userType: z
        .enum(['all', 'vendor', 'customer'])
        .optional()
        .default('all')
        .describe('Filter users by type'),
      emailId: z.string().optional().describe('Look up a specific user by email address'),
      userId: z.number().optional().describe('Look up a specific user by ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of users to return')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            emailId: z.string().optional().describe('Email address')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      let users = user ? [user] : [];
      return {
        output: { users },
        message:
          users.length > 0
            ? `Found user **${users[0]!.firstName} ${users[0]!.lastName}**.`
            : 'No user found.'
      };
    }

    if (ctx.input.emailId) {
      let result = await client.getUserByEmail(ctx.input.emailId);
      let users = Array.isArray(result) ? result : (result.users ?? result.data ?? [result]);
      return {
        output: { users },
        message:
          users.length > 0
            ? `Found **${users.length}** user(s) matching email.`
            : 'No users found.'
      };
    }

    let result: any;
    if (ctx.input.userType === 'customer') {
      result = await client.listCustomerUsers({
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
    } else if (ctx.input.userType === 'vendor') {
      result = await client.listVendorUsers({
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
    } else {
      result = await client.listUsers({ offset: ctx.input.offset, limit: ctx.input.limit });
    }

    let users = Array.isArray(result) ? result : (result.users ?? result.data ?? []);

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();
