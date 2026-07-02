import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve all users associated with the Woodpecker account, including their roles and email addresses.`,
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
            userId: z.number().optional().describe('User ID'),
            email: z.string().optional().describe('User email address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            role: z.string().optional().describe('User role')
          })
        )
        .describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let data: any = await client.listUsers();
    let users: any[] = Array.isArray(data) ? data : (data?.users ?? []);

    let mapped = users.map((u: any) => ({
      userId: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
