import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTextEmbeddingTool = SlateTool.create(spec, {
  name: 'Get Text Embedding',
  key: 'get_text_embedding',
  description: `Generates a numerical vector representation (embedding) of text for semantic similarity computation. Transforms text ranging from a single word to an entire document into a vector in semantic space. Supports cross-lingual semantic comparison without translation.`,
  instructions: ['Use perToken to get individual embeddings for each token in the text.'],
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to generate an embedding for'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.'),
      perToken: z
        .boolean()
        .optional()
        .describe('Return a vector for each individual token instead of the whole document')
    })
  )
  .output(
    z.object({
      documentEmbedding: z
        .array(z.number())
        .optional()
        .describe('Vector representation of the entire input text'),
      tokens: z
        .array(z.string())
        .optional()
        .describe('Token strings when perToken is enabled'),
      tokenEmbeddings: z
        .array(z.array(z.number()))
        .optional()
        .describe('Per-token embedding vectors when perToken is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let options: Record<string, unknown> = {};
    if (ctx.input.perToken !== undefined) {
      options.options = { perToken: ctx.input.perToken };
    }

    let result = await client.textEmbedding(ctx.input.content, ctx.input.language, options);

    return {
      output: {
        documentEmbedding: result.documentEmbedding,
        tokens: result.tokens,
        tokenEmbeddings: result.tokenEmbeddings
      },
      message: ctx.input.perToken
        ? `Generated embeddings for **${(result.tokens ?? []).length}** tokens.`
        : `Generated document embedding vector with **${(result.documentEmbedding ?? []).length}** dimensions.`
    };
  })
  .build();
