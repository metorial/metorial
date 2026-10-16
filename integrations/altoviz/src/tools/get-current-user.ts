import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the identity and profile associated with the connected Altoviz API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      email: z.string().nullable().optional(),
      displayName: z.string().nullable().optional(),
      raw: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    if (typeof user.userId !== 'string' || !user.userId.trim()) {
      throw createApiServiceError('Altoviz returned a current user without a valid userId.');
    }
    return {
      output: {
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        raw: user
      },
      message: `Retrieved current user **${user.displayName || user.userId}**.`
    };
  })
  .build();
