import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseString } from '../lib/response';
import { spec } from '../spec';

export let getCardDetails = SlateTool.create(spec, {
  name: 'Get Card Details',
  key: 'get_card_details',
  description: `Retrieve detailed information about a specific card design including images (front, inside, envelope, back), pricing, dimensions, character limits, and custom card info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cardId: z.string().describe('ID of the card to retrieve details for')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('Unique ID of the card'),
      name: z.string().optional().describe('Name of the card design'),
      coverImageUrl: z.string().optional().describe('URL of the card cover image'),
      price: z.string().optional().describe('Price of the card'),
      categoryName: z.string().optional().describe('Category the card belongs to'),
      orientation: z.string().optional().describe('Card orientation'),
      maxCharacters: z.number().optional().describe('Maximum characters for the message'),
      frontImageUrl: z.string().optional().describe('URL of the card front image'),
      insideImageUrl: z.string().optional().describe('URL of the inside of the card'),
      envelopeImageUrl: z.string().optional().describe('URL of the envelope image'),
      backImageUrl: z.string().optional().describe('URL of the card back image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCardDetails(ctx.input.cardId);
    let card = result.card ?? result;

    let images = card.images ?? {};
    let imageUrl = (value: unknown): string | undefined => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0]?.image === 'string') {
        return value[0].image;
      }
      return undefined;
    };

    return {
      output: {
        cardId: String(card.id),
        name: responseString(card.name, 'card name', true),
        coverImageUrl: card.cover ?? undefined,
        price: card.price != null ? String(card.price) : undefined,
        categoryName: card.category_name ?? undefined,
        orientation: card.orientation ?? undefined,
        maxCharacters: card.characters != null ? Number(card.characters) : undefined,
        frontImageUrl: imageUrl(images.front),
        insideImageUrl: imageUrl(images.inside),
        envelopeImageUrl: imageUrl(images.envelope),
        backImageUrl: imageUrl(images.back)
      },
      message: `Retrieved details for card \`${ctx.input.cardId}\`.`
    };
  })
  .build();
