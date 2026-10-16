import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient, requiredString } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Get the signed-in Rocketadmin user, including their ID, email, role, and current company. Requires an Email & Password connection.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      id: z.string().describe('Current user ID'),
      email: z.string().describe('Current user email'),
      user: z.record(z.string(), z.unknown()).describe('Complete user response')
    })
  )
  .handleInvocation(async ctx => {
    let user = await createRocketadminClient(ctx.auth, ctx.config).getUserInfo();
    return {
      output: {
        id: requiredString(user.id, 'user ID'),
        email: requiredString(user.email, 'user email'),
        user
      },
      message: 'Retrieved the current Rocketadmin user.'
    };
  })
  .build();
