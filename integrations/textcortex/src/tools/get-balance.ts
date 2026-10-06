import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getBalance = SlateTool.create(spec, {
  key: 'get_balance',
  name: 'Get API Credit Balance',
  description:
    'Check the API credit balance and currency for the connected TextCortex API key before generating content.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ remainingCredits: z.number(), currency: z.string() }))
  .handleInvocation(async ctx => {
    const balance = await new Client({ token: ctx.auth.token }).getBalance();
    return {
      output: { remainingCredits: balance.remaining_credits, currency: balance.currency },
      message: `Remaining TextCortex API credits: ${balance.remaining_credits} ${balance.currency}.`
    };
  })
  .build();
