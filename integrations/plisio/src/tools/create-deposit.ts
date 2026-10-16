import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { readArray, readRecord, requireText, validateOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  deposits: z
    .array(
      z.object({
        uid: z.string().describe('User identifier'),
        hash: z.string().describe('Deposit wallet address'),
        currency: z.string().describe('Cryptocurrency ID')
      })
    )
    .describe('Created deposit addresses'),
  raw: z.unknown().describe('Original provider response with credentials removed')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    requireText(ctx.input.uid, 'User identifier');
    if (ctx.input.uid.length > 255)
      throw createApiServiceError('User identifier must not exceed 255 characters.');
    if (ctx.input.currency.split(',').some(currency => !currency.trim()))
      throw createApiServiceError('Provide a cryptocurrency ID for every entry.');
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.createDeposit({
      currency: ctx.input.currency,
      uid: ctx.input.uid
    });

    let deposits = Array.isArray(result)
      ? readArray(result).map(d => ({ uid: d.uid, hash: d.hash, currency: d.psys_cid }))
      : [{ uid: readRecord(result).uid, hash: result.hash, currency: result.psys_cid }];

    return {
      output: validateOutput(outputSchema, { deposits, raw: result }),
      message: client.redact(
        `Created **${deposits.length}** deposit address${deposits.length > 1 ? 'es' : ''} for user \`${ctx.input.uid}\`.`
      )
    };
  })
  .build();
