import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { page, pagination, text } from '../lib/contracts';
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
    const params = pagination(ctx.input);
    if (ctx.input.email !== undefined) params.email = text(ctx.input.email, 'User email');
    if (ctx.input.includeDeactivated !== undefined)
      params.includeDeactivated = ctx.input.includeDeactivated;
    const result = page(await new Client(ctx.auth).listUsers(params));
    return {
      output: { users: result.data, hasNext: result.hasNext, next: result.next },
      message: `Retrieved ${result.data.length} users${result.hasNext ? '; more pages available' : ''}.`
    };
  })
  .build();
