import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let createDeposit = SlateTool.create(spec, {
  name: 'Create Deposit Address',
  key: 'create_deposit_address',
  description: `Create a permanent deposit address for receiving cryptocurrency payments. This is an alternative to invoice-based one-time payment flows. Requires white-label payment processing to be enabled.`,
  constraints: ['White-label payment processing must be enabled for your shop.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      currency: z
        .string()
        .describe('Cryptocurrency ID or comma-separated list (e.g. BTC or BTC,ETH,LTC)'),
      uid: z.string().describe('User identifier for linking deposits (max 255 characters)')
    })
  )
  .output(
    z.object({
      deposits: z
        .array(
          z.object({
            uid: z.string().describe('User identifier'),
            hash: z.string().describe('Deposit wallet address'),
            currency: z.string().describe('Cryptocurrency ID')
          })
        )
        .describe('Created deposit addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.createDeposit({
      currency: ctx.input.currency,
      uid: ctx.input.uid
    });

    let deposits = Array.isArray(result)
      ? result.map((d: any) => ({ uid: d.uid, hash: d.hash, currency: d.psys_cid }))
      : [{ uid: result.uid, hash: result.hash, currency: result.psys_cid }];

    return {
      output: { deposits },
      message: `Created **${deposits.length}** deposit address${deposits.length > 1 ? 'es' : ''} for user \`${ctx.input.uid}\`.`
    };
  })
  .build();
