import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let cardSchema = z.object({
  cardId: z.string().describe('Unique identifier of the greeting card'),
  imageUrl: z.string().describe('Full-size card image URL'),
  imageWidth: z.number().describe('Image width in pixels'),
  imageHeight: z.number().describe('Image height in pixels'),
  thumbnailUrl: z.string().describe('Thumbnail card image URL'),
  occasions: z.array(z.string()).describe('Occasion tags (e.g. "Congratulations", "Birthday")')
});

export let listCards = SlateTool.create(spec, {
  name: 'List Greeting Cards',
  key: 'list_cards',
  description: `Browse available digital greeting cards that can be attached to gift orders. Cards include occasion tags like "Congratulations", "Birthday", "Onboarding", etc.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination, starting at 1'),
      perPage: z.number().optional().describe('Items per page (1-100, default 20)')
    })
  )
  .output(
    z.object({
      cards: z.array(cardSchema).describe('List of greeting cards'),
      totalCount: z.number().describe('Total number of cards available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listCards({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let cards = (result.data || []).map((c: any) => ({
      cardId: c.id,
      imageUrl: c.image?.url,
      imageWidth: c.image?.width,
      imageHeight: c.image?.height,
      thumbnailUrl: c.image_thumb?.url,
      occasions: c.occasions || []
    }));

    let totalCount = result.list_meta?.total_count || 0;

    return {
      output: { cards, totalCount },
      message: `Found **${totalCount}** greeting cards. Showing **${cards.length}** on this page.`
    };
  })
  .build();
