import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

export let tokenizeTool = SlateTool.create(spec, {
  name: 'Tokenize Text',
  key: 'tokenize_text',
  description: `Split text into tokens using byte-pair encoding (BPE) for a specific Cohere model. Useful for estimating costs, understanding how a model processes input, and checking token limits before making API calls.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().min(1).max(65536).describe('Text to tokenize (1–65,536 characters)'),
      model: z.string().describe('Model whose tokenizer to use (e.g., "command-a-03-2025")')
    })
  )
  .output(
    z.object({
      tokens: z.array(z.number()).describe('Array of integer token IDs'),
      tokenStrings: z
        .array(z.string())
        .describe('Human-readable string representation of each token'),
      tokenCount: z.number().describe('Total number of tokens')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.tokenize({
      text: ctx.input.text,
      model: ctx.input.model
    });

    let tokens = result.tokens || [];
    let tokenStrings = result.token_strings || [];

    return {
      output: {
        tokens,
        tokenStrings,
        tokenCount: tokens.length
      },
      message: `Tokenized text into **${tokens.length}** tokens using **${ctx.input.model}** tokenizer.`
    };
  })
  .build();

export let detokenizeTool = SlateTool.create(spec, {
  name: 'Detokenize Tokens',
  key: 'detokenize_tokens',
  description: `Convert an array of token IDs back into text using a specific Cohere model's tokenizer. The inverse of tokenization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokens: z
        .array(z.number())
        .min(1)
        .describe('Array of integer token IDs to convert back to text'),
      model: z.string().describe('Model whose tokenizer to use (e.g., "command-a-03-2025")')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Decoded text from the token IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.detokenize({
      tokens: ctx.input.tokens,
      model: ctx.input.model
    });

    return {
      output: {
        text: result.text || ''
      },
      message: `Detokenized **${ctx.input.tokens.length}** tokens into text using **${ctx.input.model}** tokenizer.`
    };
  })
  .build();
