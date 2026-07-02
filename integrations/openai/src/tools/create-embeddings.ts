import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createEmbeddings = SlateTool.create(spec, {
  name: 'Create Embeddings',
  key: 'create_embeddings',
  description: `Generate vector embeddings for text input using OpenAI embedding models (text-embedding-3-small, text-embedding-3-large). Useful for search, RAG, clustering, and semantic similarity. Supports configurable output dimensions.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .optional()
        .default('text-embedding-3-small')
        .describe(
          'Embedding model to use (e.g. "text-embedding-3-small", "text-embedding-3-large")'
        ),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to embed'),
      dimensions: z
        .number()
        .optional()
        .describe('Number of output dimensions. Allows trading off quality for size.'),
      encodingFormat: z
        .enum(['float', 'base64'])
        .optional()
        .describe('Format of the returned embeddings'),
      user: z.string().optional().describe('Unique identifier for the end-user')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            index: z
              .number()
              .describe('Index of the input text this embedding corresponds to'),
            embedding: z.array(z.number()).describe('Embedding vector')
          })
        )
        .describe('Generated embeddings'),
      model: z.string().describe('Model used for embedding'),
      promptTokens: z.number().describe('Number of tokens used'),
      totalTokens: z.number().describe('Total tokens consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createEmbedding({
      model: ctx.input.model,
      input: ctx.input.input,
      dimensions: ctx.input.dimensions,
      encodingFormat: ctx.input.encodingFormat,
      user: ctx.input.user
    });

    let embeddings = (result.data ?? []).map((item: any) => ({
      index: item.index,
      embedding: item.embedding
    }));

    return {
      output: {
        embeddings,
        model: result.model,
        promptTokens: result.usage?.prompt_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0
      },
      message: `Created **${embeddings.length}** embedding(s) using **${result.model}**. Used ${result.usage?.total_tokens ?? 0} tokens.`
    };
  })
  .build();
