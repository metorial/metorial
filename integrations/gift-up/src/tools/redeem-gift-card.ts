import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let redeemGiftCard = SlateTool.create(spec, {
  name: 'Redeem Gift Card',
  key: 'redeem_gift_card',
  description: `Redeem a gift card either partially (by specifying an amount or units) or in full. Returns the transaction ID and remaining balance. Use the **redeemInFull** flag to redeem the entire balance, or specify an **amount**/**units** for a partial redemption.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      code: z.string().describe('Gift card code to redeem'),
      redeemInFull: z
        .boolean()
        .optional()
        .default(false)
        .describe('Set to true to redeem the entire remaining balance'),
      amount: z
        .number()
        .optional()
        .describe('Currency amount to redeem (for partial currency-backed redemptions)'),
      units: z
        .number()
        .optional()
        .describe('Units to redeem (for partial unit-backed redemptions)'),
      reason: z.string().optional().describe('Reason for the redemption'),
      locationId: z.string().optional().describe('Location ID where the redemption occurs'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata for the redemption')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction ID for this redemption'),
      redeemedAmount: z.number().describe('Currency amount redeemed'),
      remainingCredit: z.number().describe('Remaining currency balance after redemption'),
      redeemedUnits: z.number().nullable().describe('Units redeemed (for unit-backed cards)'),
      remainingUnits: z.number().nullable().describe('Remaining units after redemption')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let result: any;
    if (ctx.input.redeemInFull) {
      result = await client.redeemGiftCardInFull(ctx.input.code, {
        reason: ctx.input.reason,
        locationId: ctx.input.locationId,
        metadata: ctx.input.metadata
      });
    } else {
      result = await client.redeemGiftCard(ctx.input.code, {
        amount: ctx.input.amount,
        units: ctx.input.units,
        reason: ctx.input.reason,
        locationId: ctx.input.locationId,
        metadata: ctx.input.metadata
      });
    }

    let redeemDesc = ctx.input.redeemInFull
      ? 'in full'
      : `${result.redeemedAmount}${result.redeemedUnits != null ? ` (${result.redeemedUnits} units)` : ''}`;

    return {
      output: result,
      message: `Redeemed gift card **${ctx.input.code}** ${redeemDesc}. Remaining balance: ${result.remainingCredit}`
    };
  })
  .build();
