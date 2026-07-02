import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description: `Retrieve your current Plisio wallet balance for a specific cryptocurrency.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      currency: z
        .string()
        .describe('Cryptocurrency ID to check balance for (e.g. BTC, ETH, LTC, USDT)')
    })
  )
  .output(
    z.object({
      currency: z.string().describe('Cryptocurrency code'),
      balance: z.string().describe('Current balance amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.getBalance(ctx.input.currency);

    return {
      output: {
        currency: result.currency ?? result.psys_cid,
        balance: result.balance
      },
      message: `Balance: **${result.balance} ${result.currency || result.psys_cid}**`
    };
  })
  .build();
