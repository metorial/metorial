import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, ratingEnum } from '../lib/types';
import { spec } from '../spec';

export let randomGif = SlateTool.create(spec, {
  name: 'Random GIF',
  key: 'random_gif',
  description: `Get a single random GIF or sticker from GIPHY. Optionally provide a tag to get random content related to a specific word or phrase. If no tag is specified, a completely random result is returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tag: z
        .string()
        .optional()
        .describe('Optional tag to filter random content by a word or phrase'),
      contentType: z
        .enum(['gifs', 'stickers'])
        .default('gifs')
        .describe('Type of random content to return'),
      rating: ratingEnum.describe('Content rating filter (g, pg, pg-13, r)')
    })
  )
  .output(
    z.object({
      result: gifSchema.describe('A random GIF or sticker')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rating = ctx.input.rating || ctx.config.rating;

    if (ctx.input.contentType === 'stickers') {
      let result = await client.randomSticker({
        tag: ctx.input.tag,
        rating
      });
      return {
        output: { result: result.sticker },
        message: `Random sticker${ctx.input.tag ? ` for "${ctx.input.tag}"` : ''}: **${result.sticker.title || result.sticker.gifId}**`
      };
    }

    let result = await client.randomGif({
      tag: ctx.input.tag,
      rating
    });
    return {
      output: { result: result.gif },
      message: `Random GIF${ctx.input.tag ? ` for "${ctx.input.tag}"` : ''}: **${result.gif.title || result.gif.gifId}**`
    };
  })
  .build();
