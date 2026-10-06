import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the native end user authenticated by JWT Login. API tokens authorize content access and do not provide end-user identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z
        .record(z.string(), z.any())
        .describe('Native current-user record from the connected instance')
    })
  )
  .handleInvocation(async ctx => {
    const user = await Client.fromContext(ctx).getMe();
    return { output: { user }, message: 'Retrieved the authenticated Strapi end user.' };
  })
  .build();
