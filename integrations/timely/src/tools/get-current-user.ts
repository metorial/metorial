import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve your Timely identity, role, and capacity in a workspace. Call list_accounts to discover workspace IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ accountId: accountIdSchema }))
  .output(
    z.object({
      userId: z.number(),
      name: z.string(),
      email: z.string(),
      active: z.boolean(),
      role: z.string().nullable(),
      timeZone: z.string().nullable(),
      weeklyCapacity: z.number().nullable(),
      avatarUrl: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let user = await (await createTimelyClient(ctx)).getCurrentUser();
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        active: user.active ?? true,
        role: user.user_level ?? user.role?.name ?? null,
        timeZone: user.time_zone ?? null,
        weeklyCapacity: user.weekly_capacity ?? null,
        avatarUrl: user.avatar?.large_retina ?? null
      },
      message: `Connected as ${user.name} (${user.email}).`
    };
  })
  .build();
