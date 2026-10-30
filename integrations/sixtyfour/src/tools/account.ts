import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const checkBalance = SlateTool.create(spec, {
  key: 'sixtyfour_check_balance',
  name: 'Check Credit Balance',
  description:
    'Read the current credit balance of the organization associated with your API key.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ credits: z.number().describe('Available organization credits.') }))
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).get('/check-balance');
    if (typeof result.credits !== 'number' || !Number.isFinite(result.credits)) {
      throw createApiServiceError('Sixtyfour returned an invalid credit balance.');
    }
    return {
      output: { credits: result.credits },
      message: `Available credits: ${result.credits}.`
    };
  })
  .build();
