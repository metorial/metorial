import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gifSchema, paginationSchema } from '../lib/types';
import { spec } from '../spec';

export let animatedEmoji = SlateTool.create(spec, {
  name: 'Animated Emoji',
  key: 'animated_emoji',
  description: `Browse GIPHY's animated emoji library or get variations (different stylings and skin tones) for a specific emoji. Provide an emojiGifId to fetch its variations, or omit it to browse the full emoji catalog with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emojiGifId: z
        .string()
        .optional()
        .describe(
          'GIF ID of a specific emoji to fetch variations for. Omit to browse the emoji catalog.'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of emojis to return when browsing (1-50)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Results offset for pagination when browsing')
    })
  )
  .output(
    z.object({
      emojis: z.array(gifSchema).describe('Array of animated emoji or emoji variations'),
      pagination: paginationSchema
        .optional()
        .describe('Pagination information (only for catalog browsing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.emojiGifId) {
      let result = await client.getEmojiVariations(ctx.input.emojiGifId);
      return {
        output: {
          emojis: result.variations
        },
        message: `Found ${result.variations.length} variations for emoji ${ctx.input.emojiGifId}.`
      };
    }

    let result = await client.getEmoji({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: {
        emojis: result.emojis,
        pagination: result.pagination
      },
      message: `Fetched ${result.emojis.length} animated emojis.`
    };
  })
  .build();
