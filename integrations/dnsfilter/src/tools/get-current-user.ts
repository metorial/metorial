import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the user whose permissions are used by this API key, including their ID, name, and email.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.record(z.string(), z.any()).describe('Current user details') }))
  .handleInvocation(async ctx => {
    let user = await new Client(ctx.auth.token).getCurrentUser();
    return { output: { user }, message: 'Retrieved the current user.' };
  })
  .build();
