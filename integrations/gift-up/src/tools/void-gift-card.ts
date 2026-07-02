import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let voidGiftCard = SlateTool.create(spec, {
  name: 'Void Gift Card',
  key: 'void_gift_card',
  description: `Void a gift card, preventing it from being redeemed. The card can be reactivated later if needed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      code: z.string().describe('Gift card code to void'),
      reason: z.string().optional().describe('Reason for voiding'),
      locationId: z.string().optional().describe('Location ID where the void occurs'),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata')
    })
  )
  .output(
    z
      .object({
        code: z.string().describe('Gift card code'),
        isVoided: z.boolean().describe('Whether the gift card is now voided'),
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

    await client.voidGiftCard(ctx.input.code, {
      reason: ctx.input.reason,
      locationId: ctx.input.locationId,
      metadata: ctx.input.metadata
    });

    let giftCard = await client.getGiftCard(ctx.input.code);

    return {
      output: giftCard,
      message: `Voided gift card **${ctx.input.code}**${ctx.input.reason ? `: ${ctx.input.reason}` : ''}`
    };
  })
  .build();
