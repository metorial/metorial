import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export const getCurrentUserTool = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Get the identity and profile of the connected Crowdin user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      username: z.string().optional(),
      email: z.string().optional(),
      fullName: z.string().optional(),
      avatarUrl: z.string().optional(),
      organizationDomain: z.string().optional(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const user = await client.getAuthenticatedUser();
    return {
      output: {
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName ?? undefined,
        avatarUrl: user.avatarUrl,
        organizationDomain: ctx.auth.organizationDomain,
        raw: client.lastResponse
      },
      message: 'Retrieved the connected Crowdin user.'
    };
  })
  .build();
