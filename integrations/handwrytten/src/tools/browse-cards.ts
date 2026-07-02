import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cardSchema = z.object({
  cardId: z.string().describe('Unique ID of the card'),
  name: z.string().describe('Name of the card design'),
  coverImageUrl: z.string().optional().describe('URL of the card cover image'),
  price: z.string().optional().describe('Price of the card'),
  categoryName: z.string().optional().describe('Category the card belongs to'),
  orientation: z
    .string()
    .optional()
    .describe('Card orientation (Landscape, Portrait, or Flat)'),
  maxCharacters: z.number().optional().describe('Maximum characters allowed for the message')
});

export let browseCards = SlateTool.create(spec, {
  name: 'Browse Cards',
  key: 'browse_cards',
  description: `Browse available card and stationery designs. Filter by category or paginate through results. Returns card IDs needed for sending cards. Use this to find the right card design before sending.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z
        .string()
        .optional()
        .describe(
          'Filter cards by category ID. Use List Card Categories to find category IDs.'
        ),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      cards: z.array(cardSchema).describe('List of available card designs'),
      totalCards: z.number().optional().describe('Total number of cards available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCards({
      categoryId: ctx.input.categoryId,
      page: ctx.input.page
    });

    let rawCards = result.cards ?? [];
    let cards = rawCards.map((c: any) => ({
      cardId: String(c.id),
      name: c.name ?? '',
      coverImageUrl: c.cover ?? c.image_url ?? undefined,
      price: c.price != null ? String(c.price) : undefined,
      categoryName: c.category_name ?? undefined,
      orientation: c.orientation ?? undefined,
      maxCharacters: c.characters != null ? Number(c.characters) : undefined
    }));

    return {
      output: {
        cards,
        totalCards: result.total != null ? Number(result.total) : undefined
      },
      message: `Found **${cards.length}** card designs${ctx.input.categoryId ? ` in category \`${ctx.input.categoryId}\`` : ''}.`
    };
  })
  .build();
