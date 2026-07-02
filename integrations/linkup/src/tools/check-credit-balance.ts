import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCreditBalance = SlateTool.create(spec, {
  name: 'Check Credit Balance',
  key: 'check_credit_balance',
  description: `Check the remaining credit balance on your Linkup account. Useful for monitoring API usage and ensuring sufficient credits before making search or fetch requests.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      remainingCredits: z
        .number()
        .describe('The number of credits remaining on your Linkup account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info('Checking credit balance...');

    let result = await client.getCreditBalance();

    return {
      output: result,
      message: `Your Linkup account has **${result.remainingCredits}** credits remaining.`
    };
  })
  .build();
