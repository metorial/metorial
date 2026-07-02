import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let reactivateGiftCard = SlateTool.create(spec, {
  name: 'Reactivate Gift Card',
  key: 'reactivate_gift_card',
  description: `Reactivate a previously voided gift card, restoring it to an active state so it can be redeemed again.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      code: z.string().describe('Gift card code to reactivate'),
      reason: z.string().optional().describe('Reason for reactivating'),
      locationId: z.string().optional().describe('Location ID'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata')
    })
  )
  .output(
    z
      .object({
        code: z.string().describe('Gift card code'),
        isVoided: z.boolean().describe('Whether the gift card is voided'),
        canBeRedeemed: z.boolean().describe('Whether the gift card can be redeemed'),
        remainingValue: z.number().describe('Remaining balance')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    await client.reactivateGiftCard(ctx.input.code, {
      reason: ctx.input.reason,
      locationId: ctx.input.locationId,
      metadata: ctx.input.metadata
    });

    let giftCard = await client.getGiftCard(ctx.input.code);

    return {
      output: giftCard,
      message: `Reactivated gift card **${ctx.input.code}**. Card is now ${giftCard.canBeRedeemed ? 'redeemable' : 'not redeemable'}.`
    };
  })
  .build();
