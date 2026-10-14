import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCreditBalance = SlateTool.create(spec, {
  name: 'Get Credit Balance',
  key: 'get_credit_balance',
  description:
    'Retrieve the current verification credit balance before verifying emails or submitting a large batch.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      details: z
        .record(z.string(), z.unknown())
        .describe('Credit balance details returned by Kickbox.'),
      remainingCredits: z
        .number()
        .optional()
        .describe('Remaining verification credits when reported in the response headers.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sandbox: ctx.config.sandbox });
    let output = await client.getCreditBalance();
    return {
      output,
      message:
        output.remainingCredits === undefined
          ? 'Retrieved the current Kickbox credit balance.'
          : `You have **${output.remainingCredits}** verification credits remaining.`
    };
  })
  .build();
