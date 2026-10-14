import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated ERPNext user identifier for the current connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.string().describe('The authenticated ERPNext user identifier') }))
  .handleInvocation(async ctx => {
    let user = await createClient(ctx).getCurrentUser();
    return {
      output: { user },
      message: `Authenticated as **${user}**`
    };
  })
  .build();
