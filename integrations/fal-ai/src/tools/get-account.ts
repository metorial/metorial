import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export const getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Identify the authenticated fal.ai account and retrieve its credit balance. Requires an ADMIN-scoped API key; ordinary model inference and discovery use API-scoped keys.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Authenticated personal or team account username'),
      creditBalance: z.number().optional().describe('Current credit balance'),
      currency: z.string().optional().describe('Credit balance currency')
    })
  )
  .handleInvocation(async ctx => {
    const output = await new FalClient(ctx.auth.token).getAccount();
    return { output, message: `Authenticated account: **${output.username}**.` };
  })
  .build();
