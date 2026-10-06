import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { id, z } from '../lib/schemas';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Read the native connected Make user in the saved region. Does not infer an identity from a token or return organizations from another region.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: id,
      name: z.string().optional(),
      email: z.string().optional(),
      avatar: z.string().optional(),
      zoneUrl: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx),
      user = await client.getCurrentUser();
    return {
      output: {
        userId: user.id,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        avatar: user.avatar ?? undefined,
        zoneUrl: client.zoneUrl
      },
      message: 'Retrieved the native connected user in this region.'
    };
  })
  .build();
