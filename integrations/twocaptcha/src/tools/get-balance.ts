import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoCaptchaClient } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description: `Retrieve the current account balance in USD. Useful for monitoring spending and ensuring sufficient funds are available for solving captchas.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.number().describe('Current account balance in USD'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoCaptchaClient({ token: ctx.auth.token });
    let result = await client.getBalance();

    return {
      output: {
        balance: result.balance,
        raw: result
      },
      message: `Current account balance: **$${result.balance.toFixed(4)}**`
    };
  })
  .build();
