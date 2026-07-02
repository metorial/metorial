import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Lever account. Supports filtering by email and including deactivated users.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by user email'),
      includeDeactivated: z
        .boolean()
        .optional()
        .describe('Include deactivated users in results'),
      limit: z.number().optional().describe('Max results to return'),
      offset: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      users: z.array(z.any()).describe('List of user objects'),
      hasNext: z.boolean().describe('Whether more results are available'),
      next: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let params: Record<string, any> = {};
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.includeDeactivated) params.includeDeactivated = ctx.input.includeDeactivated;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listUsers(params);

    return {
      output: {
        users: result.data || [],
        hasNext: result.hasNext || false,
        next: result.next || undefined
      },
      message: `Found ${(result.data || []).length} users.${result.hasNext ? ' More results available.' : ''}`
    };
  })
  .build();
