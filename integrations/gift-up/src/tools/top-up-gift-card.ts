import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let topUpGiftCard = SlateTool.create(spec, {
  name: 'Top Up Gift Card',
  key: 'top_up_gift_card',
  description: `Add credit or units to an existing gift card's balance.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      code: z.string().describe('Gift card code to top up'),
      amount: z
        .number()
        .optional()
        .describe('Currency amount to add (for currency-backed cards)'),
      units: z.number().optional().describe('Units to add (for unit-backed cards)'),
      reason: z.string().optional().describe('Reason for the top-up'),
      locationId: z.string().optional().describe('Location ID where the top-up occurs'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID for the top-up'),
      remainingCredit: z.number().describe('Remaining currency balance after top-up'),
      remainingUnits: z.number().nullable().describe('Remaining units after top-up')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result = await client.topUpGiftCard(ctx.input.code, {
      amount: ctx.input.amount,
      units: ctx.input.units,
      reason: ctx.input.reason,
      locationId: ctx.input.locationId,
      metadata: ctx.input.metadata
    });

    let addedDesc = ctx.input.amount ? `${ctx.input.amount}` : `${ctx.input.units} units`;
    return {
      output: result,
      message: `Topped up gift card **${ctx.input.code}** by ${addedDesc}. New balance: ${result.remainingCredit}`
    };
  })
  .build();
