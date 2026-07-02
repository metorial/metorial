import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let denominationSchema = z.object({
  denominationId: z.string().describe('ID of the denomination'),
  amount: z.string().optional().describe('Dollar amount of the denomination')
});

let giftCardSchema = z.object({
  giftCardId: z.string().describe('Unique ID of the gift card brand'),
  name: z.string().describe('Name of the gift card brand (e.g., Starbucks, Amazon)'),
  imageUrl: z.string().optional().describe('URL of the gift card image'),
  denominations: z.array(denominationSchema).optional().describe('Available denominations')
});

export let listGiftCards = SlateTool.create(spec, {
  name: 'List Gift Cards',
  key: 'list_gift_cards',
  description: `Retrieve available gift cards that can be included with handwritten card orders. Returns brands (e.g., Starbucks, Amazon) and their available denominations. Use the denomination ID when sending a card with a gift card.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      giftCards: z
        .array(giftCardSchema)
        .describe('Available gift card brands and denominations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listGiftCards();
    let rawCards = result.gcards ?? result.gift_cards ?? [];

    let giftCards = rawCards.map((g: any) => ({
      giftCardId: String(g.id),
      name: g.name ?? '',
      imageUrl: g.image ?? undefined,
      denominations: (g.denominations ?? []).map((d: any) => ({
        denominationId: String(d.id),
        amount: d.amount != null ? String(d.amount) : undefined
      }))
    }));

    return {
      output: { giftCards },
      message: `Found **${giftCards.length}** gift card brands.`
    };
  })
  .build();
