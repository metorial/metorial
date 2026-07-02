import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in the Pipeline CRM account. Useful for finding user IDs to assign as owners for deals, people, and companies.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('Unique user ID'),
            firstName: z.string().nullable().optional().describe('First name'),
            lastName: z.string().nullable().optional().describe('Last name'),
            email: z.string().nullable().optional().describe('Email address')
          })
        )
        .describe('List of users in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let users = await client.listUsers();

    let userList = (Array.isArray(users) ? users : []).map((user: any) => ({
      userId: user.id,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      email: user.email ?? null
    }));

    return {
      output: {
        users: userList
      },
      message: `Found **${userList.length}** users`
    };
  })
  .build();
