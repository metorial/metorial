import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: 'Return the Metabase user represented by the current connection.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
      isSuperuser: z.boolean(),
      isActive: z.boolean(),
      dateJoined: z.string().optional(),
      lastLogin: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient(ctx.auth);
    let user = await client.getCurrentUser();
    return {
      output: {
        userId: user.id,
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        email: user.email,
        isSuperuser: user.is_superuser ?? false,
        isActive: user.is_active ?? true,
        dateJoined: user.date_joined,
        lastLogin: user.last_login ?? null
      },
      message: `Connected as **${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}** (${user.email})`
    };
  })
  .build();
