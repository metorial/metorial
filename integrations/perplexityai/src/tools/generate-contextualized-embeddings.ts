import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';
import { spec } from '../spec';

let validateDimensions = (model: string, dimensions: number | undefined) => {
  if (dimensions === undefined) return;

  let maxDimensions = model === 'pplx-embed-context-v1-0.6b' ? 1024 : 2560;
  if (dimensions > maxDimensions) {
    throw perplexityServiceError(
      `${model} supports dimensions between 128 and ${maxDimensions}.`
    );
  }
};

export let generateContextualizedEmbeddings = SlateTool.create(spec, {
  name: 'Generate Contextualized Embeddings',
  key: 'generate_contextualized_embeddings',
  description: `Generate context-aware embeddings for document chunks using Perplexity's contextualized embedding models. Each inner document array contains chunks from the same document, so embeddings can account for neighboring chunk context.

Available models:
- **pplx-embed-context-v1-0.6b** - Contextualized, lightweight (1024 dimensions)
- **pplx-embed-context-v1-4b** - Contextualized, higher quality (2560 dimensions)`,
  instructions: [
    'Pass documents as nested arrays: each document is an array of chunk strings.',
    'For query embeddings with a contextualized model, wrap each query as a single-chunk document such as [["query text"]].',
    'Total tokens per document must not exceed 32K; total chunks across all documents must not exceed 16,000.'
  ],
  constraints: [
    'Maximum 512 documents per request.',
    'Maximum 16,000 total chunks per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documents: z
        .array(z.array(z.string()).min(1))
        .min(1)
        .max(512)
        .describe(
          'Nested document chunks; each inner array contains chunks from one document'
        ),
      model: z
        .enum(['pplx-embed-context-v1-0.6b', 'pplx-embed-context-v1-4b'])
        .default('pplx-embed-context-v1-4b')
        .describe('Contextualized embedding model to use'),
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
      documents: z
        .array(
          z.object({
            index: z.number().describe('Index corresponding to the input document'),
            embeddings: z
              .array(
                z.object({
                  index: z.number().describe('Index corresponding to the input chunk'),
                  embedding: z.string().describe('Base64-encoded embedding vector')
                })
              )
              .describe('Generated embeddings for chunks in this document')
          })
        )
        .describe('Generated contextualized embeddings grouped by input document'),
      model: z.string().optional().describe('Model used for generation'),
      promptTokens: z.number().optional().describe('Tokens used in the input'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);

    validateDimensions(ctx.input.model, ctx.input.dimensions);

    let response = await client.createContextualizedEmbeddings({
      model: ctx.input.model,
      input: ctx.input.documents,
      dimensions: ctx.input.dimensions,
      encoding_format: ctx.input.encodingFormat
    });

    let documents = response.data.map(document => ({
      index: document.index,
      embeddings: document.data.map(item => ({
        index: item.index,
        embedding: item.embedding
      }))
    }));

    let embeddingCount = documents.reduce(
      (sum, document) => sum + document.embeddings.length,
      0
    );

    return {
      output: {
        documents,
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        totalTokens: response.usage?.total_tokens
      },
      message: `Generated **${embeddingCount}** contextualized embeddings across **${documents.length}** documents using **${ctx.input.model}**${response.usage ? ` (${response.usage.total_tokens} tokens)` : ''}`
    };
  })
  .build();
