import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the FreeAgent user who authorized this connection, including their profile URL, email, role, and permission level.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z
        .object({
          url: z.string(),
          first_name: z.string(),
          last_name: z.string(),
          email: z.string(),
          role: z.string(),
          permission_level: z.number()
        })
        .passthrough()
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx).getCurrentUser();
    return { output: { user }, message: 'Retrieved the current FreeAgent user.' };
  })
  .build();
