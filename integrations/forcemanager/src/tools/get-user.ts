import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve user records from ForceManager (read-only).
Fetch a specific user by ID or list/search users. Users include branch assignments, permission levels, and last known geolocation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Specific user ID to retrieve'),
      query: z.string().optional().describe('ForceManager query language filter'),
      name: z.string().optional().describe('Search by name (LIKE match)'),
      email: z.string().optional().describe('Search by email (LIKE match)'),
      page: z.number().optional().describe('Page number (0-indexed)')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).describe('List of matching user records'),
      totalCount: z.number().describe('Number of records returned'),
      nextPage: z.number().nullable().describe('Next page number, or null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.userId) {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: { users: [user], totalCount: 1, nextPage: null },
        message: `Retrieved user **${user?.name || ''} ${user?.lastName || ''}** (ID: ${ctx.input.userId})`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.email) params.email = ctx.input.email;

    let result = await client.listUsers(params, ctx.input.page);

    return {
      output: {
        users: result.records,
        totalCount: result.entityCount,
        nextPage: result.nextPage
      },
      message: `Found **${result.entityCount}** user(s)${result.nextPage !== null ? ` (more pages available)` : ''}`
    };
  })
  .build();
