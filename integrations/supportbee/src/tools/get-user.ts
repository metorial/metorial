import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { userSchema } from '../lib/types';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description:
    'Retrieve an agent, customer, or customer group by its user ID. Call list_agents to discover users.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z.number().describe('User ID from list_agents or a ticket requester')
    })
  )
  .output(userSchema)
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.userId) || ctx.input.userId < 1) {
      throw createApiServiceError('userId must be a positive whole number.');
    }
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });
    let user = await client.getUser(ctx.input.userId);
    return { output: user, message: `Retrieved user **#${user.userId}**` };
  })
  .build();
