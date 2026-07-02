import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let emojiSuggestions = SlateTool.create(spec, {
  name: 'Emoji Suggestions',
  key: 'emoji_suggestions',
  description: `Suggests relevant emojis for text or automatically inserts emojis into text content.
Use "suggest" mode to get a list of relevant emojis, or "emojify" mode to get back the text with emojis automatically inserted at relevant positions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to get emoji suggestions for or to auto-emojify'),
      mode: z
        .enum(['suggest', 'emojify'])
        .optional()
        .describe(
          'Mode: "suggest" returns emoji list, "emojify" inserts emojis into text (default: suggest)'
        )
    })
  )
  .output(
    z.object({
      emojis: z
        .array(
          z.object({
            emoji: z.string().describe('Emoji character'),
            score: z.number().describe('Relevance score')
          })
        )
        .optional()
        .describe('List of suggested emojis (suggest mode)'),
      emojifiedText: z
        .string()
        .optional()
        .describe('Text with emojis automatically inserted (emojify mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let mode = ctx.input.mode || 'suggest';

    if (mode === 'emojify') {
      let result = await client.autoEmojify(ctx.input.text);

      return {
        output: {
          emojifiedText: result.text
        },
        message: `Auto-emojified text: "${result.text}"`
      };
    }

    let result = await client.emojiSuggestions(ctx.input.text);
    let emojis = result.emojis || [];

    return {
      output: { emojis },
      message: `Found **${emojis.length}** emoji suggestions: ${emojis
        .slice(0, 10)
        .map(e => e.emoji)
        .join(' ')}`
    };
  })
  .build();
