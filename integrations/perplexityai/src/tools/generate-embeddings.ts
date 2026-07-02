import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';
import { spec } from '../spec';

let validateDimensions = (model: string, dimensions: number | undefined) => {
  if (dimensions === undefined) return;

  let maxDimensions = model === 'pplx-embed-v1-0.6b' ? 1024 : 2560;
  if (dimensions > maxDimensions) {
    throw perplexityServiceError(
      `${model} supports dimensions between 128 and ${maxDimensions}.`
    );
  }
};

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings for independent texts using Perplexity's standard pplx-embed models. Useful for semantic search, clustering, retrieval-augmented generation (RAG), and recommendation systems.

Available models:
- **pplx-embed-v1-0.6b** - Lightweight, low-latency (1024 dimensions)
- **pplx-embed-v1-4b** - Higher quality retrieval (2560 dimensions)

Use generate_contextualized_embeddings for document chunks that need shared document context. Embeddings are returned as base64-encoded INT8 or binary vectors.`,
  instructions: [
    'Each text must not exceed 32K tokens, and total input must not exceed 120K tokens per request.',
    'Compare INT8 embeddings using cosine similarity.',
    'Use contextualized embeddings for document chunks that need surrounding context for better relevance.'
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
        .enum(['pplx-embed-v1-0.6b', 'pplx-embed-v1-4b'])
        .default('pplx-embed-v1-4b')
        .describe('Standard embedding model to use'),
      dimensions: z
        .number()
        .int()
        .min(128)
        .max(2560)
        .optional()
        .describe('Custom embedding vector dimensions'),
      encodingFormat: z
        .enum(['base64_int8', 'base64_binary'])
        .optional()
        .describe('Embedding encoding format')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            index: z.number().describe('Index corresponding to the input text'),
            embedding: z.string().describe('Base64-encoded embedding vector')
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

    validateDimensions(ctx.input.model, ctx.input.dimensions);

    let response = await client.createEmbeddings({
      model: ctx.input.model,
      input: ctx.input.texts,
      dimensions: ctx.input.dimensions,
      encoding_format: ctx.input.encodingFormat
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
