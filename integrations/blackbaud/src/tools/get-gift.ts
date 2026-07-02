import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGift = SlateTool.create(spec, {
  name: 'Get Gift',
  key: 'get_gift',
  description: `Retrieve a gift record by ID. Returns detailed gift information including splits, fundraiser credits, soft credits, receipts, acknowledgements, and payments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      giftId: z.string().describe('System record ID of the gift.')
    })
  )
  .output(
    z.object({
      gift: z.any().describe('The gift record with full details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let gift = await client.getGift(ctx.input.giftId);

    let amount = gift?.amount?.value;
    let amountStr = amount !== undefined ? `$${amount}` : 'unknown amount';

    return {
      output: { gift },
      message: `Retrieved gift **${ctx.input.giftId}** (${gift?.type || 'unknown type'}, ${amountStr}).`
    };
  })
  .build();
