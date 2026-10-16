import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { collection, requiredId } from '../lib/response';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all user accounts associated with the CATS site. Useful for finding user IDs when assigning tasks, owners, or recruiters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email'),
            isActive: z.boolean().optional().describe('Whether active')
          })
        )
        .describe('Users'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listUsers({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let users = collection(data, 'users').map((u: any) => ({
      userId: requiredId(u.id, 'record'),
      firstName: u.first_name ?? undefined,
      lastName: u.last_name ?? undefined,
      email: u.username ?? undefined,
      isActive: u.is_active ?? undefined
    }));

    return {
      output: {
        users,
        totalCount: data?.total ?? undefined
      },
      message: `Listed **${users.length}** user(s).`
    };
  })
  .build();
