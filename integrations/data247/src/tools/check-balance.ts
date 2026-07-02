import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkBalance = SlateTool.create(spec, {
  name: 'Check Balance',
  key: 'check_balance',
  description: `Check your current Data247 account balance. Returns the prepaid balance available for API lookups.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      balance: z.string().describe('Current account balance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getBalance();

    return {
      output: result,
      message: `Account balance: **$${result.balance}**.`
    };
  })
  .build();
