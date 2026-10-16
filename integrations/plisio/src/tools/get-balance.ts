import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { readRecord, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  currency: z.string().describe('Cryptocurrency code'),
  balance: z.string().describe('Current balance amount'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = readRecord(await client.getBalance(ctx.input.currency));

    return {
      output: validateOutput(outputSchema, {
        currency: result.currency ?? result.psys_cid,
        balance: result.balance,
        raw: result
      }),
      message: client.redact(
        `Balance: **${result.balance} ${result.currency || result.psys_cid}**`
      )
    };
  })
  .build();
