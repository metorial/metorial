import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the profile of the user associated with the connected Truvera API key.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z.record(z.string(), z.unknown()).describe('Current user profile metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });
    let profile = await client.getCurrentUser();
    return { output: { profile }, message: 'Retrieved the current Truvera user profile.' };
  })
  .build();
