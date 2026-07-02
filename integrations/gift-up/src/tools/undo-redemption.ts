import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let undoRedemption = SlateTool.create(spec, {
  name: 'Undo Redemption',
  key: 'undo_redemption',
  description: `Reverse a previous gift card redemption using its transaction ID. Restores the redeemed amount/units back to the gift card balance.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      code: z.string().describe('Gift card code'),
      transactionId: z.string().describe('Transaction ID of the redemption to reverse'),
      reason: z.string().optional().describe('Reason for undoing the redemption'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID of the reversal'),
      amountReversed: z.number().describe('Currency amount restored'),
      unitsReversed: z.number().nullable().describe('Units restored'),
      alreadyReversed: z.boolean().describe('Whether this redemption was already reversed'),
      remainingCredit: z.number().describe('Remaining balance after reversal'),
      remainingUnits: z.number().nullable().describe('Remaining units after reversal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result = await client.undoRedemption(ctx.input.code, {
      transactionId: ctx.input.transactionId,
      reason: ctx.input.reason,
      metadata: ctx.input.metadata
    });

    if (result.alreadyReversed) {
      return {
        output: result,
        message: `Redemption **${ctx.input.transactionId}** on gift card **${ctx.input.code}** was already reversed.`
      };
    }

    return {
      output: result,
      message: `Reversed redemption on gift card **${ctx.input.code}**: restored ${result.amountReversed}. New balance: ${result.remainingCredit}`
    };
  })
  .build();
