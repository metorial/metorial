import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  key: 'get_user',
  name: 'Get User',
  description: 'Retrieve a user by ID. Call list_users to discover available IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      userId: z.string().describe('Resource ID from list_users')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('Complete provider resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUser(ctx.input.userId);
    return { message: 'Get user completed.', output: { user: result.data ?? result } };
  });
