import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users in the Timelink workspace. Returns user details including names and email addresses. Useful for finding user IDs to assign to time entries or to see who is part of the team.`,
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
            userId: z.number().describe('Unique identifier of the user'),
            name: z.string().describe('Name of the user'),
            email: z.string().describe('Email address of the user')
          })
        )
        .describe('List of users in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let users = await client.listUsers();

    let mappedUsers = users.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email
    }));

    return {
      output: { users: mappedUsers },
      message: `Found **${mappedUsers.length}** user(s) in the workspace.`
    };
  })
  .build();
