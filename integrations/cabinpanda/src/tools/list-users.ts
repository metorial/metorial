import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users associated with the account. Useful for managing team access and understanding account membership.`,
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
            userId: z.string().optional().describe('Unique identifier for the user'),
            name: z.string().optional().describe('Name of the user'),
            email: z.string().optional().describe('Email address of the user'),
            role: z.string().optional().describe('Role of the user in the account'),
            raw: z.any().optional().describe('Full user object from the API')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let users = await client.listUsers();

    let mappedUsers = (Array.isArray(users) ? users : []).map((user: any) => ({
      userId: user?.id?.toString(),
      name: user?.name,
      email: user?.email,
      role: user?.role,
      raw: user
    }));

    return {
      output: { users: mappedUsers },
      message: `Found **${mappedUsers.length}** user(s).`
    };
  })
  .build();
