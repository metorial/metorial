import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Outreach organization. Returns user profiles with names, emails, and roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z.number().optional().describe('Page offset for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          title: z.string().optional(),
          locked: z.boolean().optional(),
          createdAt: z.string().optional()
        })
      ),
      hasMore: z.boolean(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, string> = {};
    if (ctx.input.email) params['filter[email]'] = ctx.input.email;
    if (ctx.input.pageSize) params['page[size]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = ctx.input.pageOffset.toString();

    let result = await client.listUsers(params);

    let users = result.records.map(r => {
      let flat = flattenResource(r);
      return {
        userId: flat.id,
        firstName: flat.firstName,
        lastName: flat.lastName,
        email: flat.email,
        title: flat.title,
        locked: flat.locked,
        createdAt: flat.createdAt
      };
    });

    return {
      output: {
        users,
        hasMore: result.hasMore,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${users.length}** users${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
