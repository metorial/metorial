import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Get the authenticated Gigasheet user and detailed account information.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('Authentication identity'),
      details: z.record(z.string(), z.unknown()).describe('Detailed user information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let user = await client.whoami();
    let details = await client.getUserDetails();
    return { output: { user, details }, message: 'Retrieved the current Gigasheet user.' };
  })
  .build();
