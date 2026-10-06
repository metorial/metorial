import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the YNAB user ID associated with this connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ userId: z.string().describe('Authenticated YNAB user ID.') }))
  .handleInvocation(async ctx => ({
    output: { userId: (await new Client({ token: ctx.auth.token }).getUser()).id },
    message: 'Retrieved the connected user identity.'
  }))
  .build();
