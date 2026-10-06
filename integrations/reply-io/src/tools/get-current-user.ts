import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Discover the user and team resolved by the API key and any configured impersonation. No domain scope is required.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      username: z.string().optional(),
      teamId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).getCurrentUser(),
    message: 'Retrieved the current Reply.io user.'
  }))
  .build();
