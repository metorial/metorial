import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, ratingEnum } from '../lib/types';
import { spec } from '../spec';

export let translateToGif = SlateTool.create(spec, {
  name: 'Translate to GIF',
  key: 'translate_to_gif',
  description: `Convert a word or phrase into the single best-matching GIF or sticker using GIPHY's translate algorithm. Ideal for converting text into expressive visual content, similar to GIPHY's Slack integration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z.string().describe('Word or phrase to translate into a GIF or sticker'),
      contentType: z
        .enum(['gifs', 'stickers'])
        .default('gifs')
        .describe('Type of content to return'),
      rating: ratingEnum.describe('Content rating filter (g, pg, pg-13, r)')
    })
  )
  .output(
    z.object({
      result: gifSchema.describe('The best-matching GIF or sticker')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rating = ctx.input.rating || ctx.config.rating;

    if (ctx.input.contentType === 'stickers') {
      let result = await client.translateSticker({
        searchTerm: ctx.input.searchTerm,
        rating
      });
      return {
        output: { result: result.sticker },
        message: `Translated "${ctx.input.searchTerm}" to sticker: **${result.sticker.title || result.sticker.gifId}**`
      };
    }

    let result = await client.translateGif({
      searchTerm: ctx.input.searchTerm,
      rating
    });
    return {
      output: { result: result.gif },
      message: `Translated "${ctx.input.searchTerm}" to GIF: **${result.gif.title || result.gif.gifId}**`
    };
  })
  .build();
