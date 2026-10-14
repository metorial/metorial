import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Current User',
  key: 'who_am_i',
  description: 'Retrieve the currently authenticated Follow Up Boss user and their role.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      role: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let user = await createClient(ctx).getMe();
    return {
      output: {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      message: `Authenticated as **${[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.id}** (ID: ${user.id}).`
    };
  })
  .build();
