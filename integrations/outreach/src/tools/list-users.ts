import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Outreach organization. Returns user profiles with names, emails and titles. This lists organization users; it does not identify the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; omit to use cursor pagination.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; keep the same filters and sorting.')
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
      nextPageOffset: z
        .number()
        .optional()
        .describe('Use as pageOffset for the next page with the same filters.'),
      nextPageAfter: z
        .string()
        .optional()
        .describe('Pass as pageAfter for the next page with unchanged filters.'),
      totalCount: z
        .number()
        .optional()
        .describe('Exact provider count when available and not truncated.')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, string> = {};
    if (ctx.input.email) params['filter[email]'] = ctx.input.email;
    if (ctx.input.pageSize) params['page[limit]'] = ctx.input.pageSize.toString();
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
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
        nextPageOffset: result.nextPageOffset,
        nextPageAfter: result.nextPageAfter,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found **${users.length}** users${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
