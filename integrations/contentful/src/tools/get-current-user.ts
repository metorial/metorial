import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Read the user authenticated by a Content Management API PAT or OAuth token. Delivery and Preview API keys do not identify a CMA user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      avatarUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx.config, ctx.auth, {}, true).getCurrentUser();
    return {
      output: {
        userId: user.sys.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      message: 'Retrieved the authenticated Contentful user.'
    };
  })
  .build();
