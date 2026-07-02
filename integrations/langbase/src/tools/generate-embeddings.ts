import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings for text chunks. Useful for semantic search, text similarity comparisons, and NLP tasks. Supports embedding models from OpenAI and Cohere.`,
  constraints: [
    'Maximum of 100 chunks per request.',
    'Each chunk must be at most 8,192 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chunks: z
        .array(z.string())
        .describe('Array of text chunks to generate embeddings for (max 100)'),
      embeddingModel: z
        .enum([
          'openai:text-embedding-3-large',
          'cohere:embed-multilingual-v3.0',
          'cohere:embed-multilingual-light-v3.0',
          'google:text-embedding-004'
        ])
        .optional()
        .describe('Embedding model to use. Defaults to openai:text-embedding-3-large.')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(z.array(z.number()))
        .describe('2D array of embedding vectors, one per input chunk'),
      embeddingCount: z.number().describe('Number of embeddings generated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      chunks: ctx.input.chunks
    };

    if (ctx.input.embeddingModel !== undefined) body.embeddingModel = ctx.input.embeddingModel;

    let result = await client.generateEmbeddings(body);
    let embeddings = Array.isArray(result) ? result : [];

    return {
      output: {
        embeddings,
        embeddingCount: embeddings.length
      },
      message: `Generated **${embeddings.length}** embedding(s) with ${embeddings[0]?.length ?? 0} dimensions each.`
    };
  })
  .build();
