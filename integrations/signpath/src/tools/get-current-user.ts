import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated SignPath user, including CI users, their role, and account status.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      userType: z.string(),
      role: z.string(),
      status: z.string(),
      identity: z.string().optional(),
      accountEmailAddress: z.string().optional(),
      isDirectorySynchronized: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let user = await createSignPathClient(ctx).getCurrentUser();
    return {
      output: {
        userId: user.userId,
        name: user.name,
        userType: user.userType,
        role: user.role,
        status: user.status,
        identity: user.identity ?? undefined,
        accountEmailAddress: user.accountEmailAddress ?? undefined,
        isDirectorySynchronized: user.isDirectorySynchronized
      },
      message: `Authenticated as **${user.name}** (${user.userType}, ${user.role}).`
    };
  })
  .build();
