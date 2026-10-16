import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Returns the name and email of the AlgoDocs account connected to these credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      fullName: z.string().describe('Account holder name'),
      email: z.string().describe('Account email address'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete account response')
    })
  )
  .handleInvocation(async ctx => {
    let account = await new Client(ctx.auth).getMe();
    return {
      output: account,
      message: `Connected as **${account.fullName}** (${account.email}).`
    };
  })
  .build();
