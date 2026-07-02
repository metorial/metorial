import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { spec } from '../spec';

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings for text using Perplexity's pplx-embed models. Useful for semantic search, clustering, retrieval-augmented generation (RAG), and recommendation systems.

Available models:
- **pplx-embed-v1-0.6b** - Lightweight, low-latency (1024 dimensions)
- **pplx-embed-v1-4b** - Higher quality retrieval (2560 dimensions)
- **pplx-embed-context-v1-0.6b** - Contextualized, lightweight (1024 dimensions)
- **pplx-embed-context-v1-4b** - Contextualized, higher quality (2560 dimensions)

Standard models are best for independent texts and search queries. Contextualized models are optimized for document chunks that benefit from surrounding context. All models produce INT8-quantized embeddings natively.`,
  instructions: [
    'Each text must not exceed 32K tokens, and total input must not exceed 120K tokens per request.',
    'Compare INT8 embeddings using cosine similarity.',
    'Use contextualized models (pplx-embed-context-*) for document chunks that need surrounding context for better relevance.'
  ],
  constraints: [
    'Maximum 32K tokens per individual text input.',
    'Maximum 120K combined tokens per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      texts: z.array(z.string()).min(1).describe('List of texts to generate embeddings for'),
      model: z
        .enum([
          'pplx-embed-v1-0.6b',
          'pplx-embed-v1-4b',
          'pplx-embed-context-v1-0.6b',
          'pplx-embed-context-v1-4b'
        ])
        .default('pplx-embed-v1-4b')
        .describe('Embedding model to use'),
      dimensions: z.number().optional().describe('Custom embedding vector dimensions')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            index: z.number().describe('Index corresponding to the input text'),
            embedding: z
              .union([z.string(), z.array(z.number())])
              .describe('Embedding vector (base64-encoded INT8 or float array)')
          })
        )
        .describe('Generated embeddings for each input text'),
      model: z.string().optional().describe('Model used for generation'),
      promptTokens: z.number().optional().describe('Tokens used in the input'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);

    let isContextualized = ctx.input.model.includes('context');

    let response = isContextualized
      ? await client.createContextualizedEmbeddings({
          model: ctx.input.model,
          input: ctx.input.texts,
          dimensions: ctx.input.dimensions
        })
      : await client.createEmbeddings({
          model: ctx.input.model,
          input: ctx.input.texts,
          dimensions: ctx.input.dimensions
        });

    let embeddings = response.data.map(item => ({
      index: item.index,
      embedding: item.embedding
    }));

    return {
      output: {
        embeddings,
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        totalTokens: response.usage?.total_tokens
      },
      message: `Generated **${embeddings.length}** embeddings using **${ctx.input.model}**${response.usage ? ` (${response.usage.total_tokens} tokens)` : ''}`
    };
  })
  .build();
