import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated Weaviate username, assigned roles, and groups. Requires a server that supports the current-user endpoint.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Authenticated username'),
      roles: z.array(z.any()).optional().describe('Assigned roles and their permissions'),
      groups: z.array(z.string()).optional().describe('User groups')
    })
  )
  .handleInvocation(async ctx => ({
    output: await createClient(ctx).getCurrentUser(),
    message: 'Retrieved the authenticated Weaviate user.'
  }))
  .build();
