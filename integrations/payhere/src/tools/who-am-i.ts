import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Retrieve the currently authenticated Payhere user and verify which account the API key belongs to.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('Authenticated user identifier'),
      displayName: z.string(),
      email: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      raw: z.record(z.string(), z.unknown()).optional().describe('Original provider data')
    })
  )
  .handleInvocation(async ctx => {
    let user = await new PayhereClient({ token: ctx.auth.token }).getUser();
    return { output: user, message: `Connected as ${user.displayName} (${user.email}).` };
  })
  .build();
