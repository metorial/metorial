import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let tokenizeTextTool = SlateTool.create(spec, {
  name: 'Tokenize Text',
  key: 'tokenize_text',
  description: `Splits text into individual tokens (words, numbers, punctuation) using advanced statistical modeling. Particularly useful for languages like Chinese, Japanese, and Thai where word boundaries are not marked by spaces.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to tokenize'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      tokens: z.array(z.string()).describe('List of tokens extracted from the text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.tokenize(ctx.input.content, ctx.input.language);

    let tokens = result.tokens ?? [];

    return {
      output: {
        tokens
      },
      message: `Tokenized text into **${tokens.length}** token${tokens.length === 1 ? '' : 's'}.`
    };
  })
  .build();
