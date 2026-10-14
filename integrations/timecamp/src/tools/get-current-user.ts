import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Get the authenticated TimeCamp user, root group ID, and account permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      displayName: z.string(),
      rootGroupId: z.string(),
      permissions: z.record(z.string(), z.boolean())
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: {
        userId: String(user.user_id),
        email: user.email ?? '',
        displayName: user.display_name ?? '',
        rootGroupId: String(user.root_group_id ?? ''),
        permissions: user.permissions ?? {}
      },
      message: `Retrieved the profile for **${user.display_name ?? user.email ?? user.user_id}**.`
    };
  })
  .build();
