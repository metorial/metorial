import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description:
    'List CentralStationCRM account users to discover IDs for assigning tasks and CRM records.',
  constraints: ['Maximum 250 results per page.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      activeOnly: z.boolean().optional().describe('Return only active users when true'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      perPage: z.number().int().min(1).max(250).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.number().describe('User ID for task and record assignments'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          email: z.string().optional().describe('Login email address')
        })
      ),
      count: z.number().describe('Number of users on this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountName: ctx.config.accountName });
    let result = await client.listUsers({
      page: ctx.input.page,
      perpage: ctx.input.perPage,
      active: ctx.input.activeOnly ? 'true' : undefined
    });
    let users = (Array.isArray(result) ? result : []).map(item => {
      let user = item?.user ?? item;
      return {
        userId: user.id,
        firstName: user.first ?? undefined,
        lastName: user.name ?? undefined,
        email: user.login ?? undefined
      };
    });
    return {
      output: { users, count: users.length },
      message: `Found **${users.length}** users.`
    };
  })
  .build();
