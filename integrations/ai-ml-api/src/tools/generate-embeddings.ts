import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings from text for semantic search, similarity analysis, clustering, and classification.
Supports models like text-embedding-3-small (1536 dimensions), text-embedding-3-large (3072 dimensions), and multilingual models.
Can embed single strings or batches of text in a single request.`,
  instructions: [
    'Use model IDs like "text-embedding-3-small", "text-embedding-3-large", "text-multilingual-embedding-002".',
    'Use the dimensions parameter to reduce embedding size without losing representational quality.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Embedding model ID, e.g. "text-embedding-3-large", "text-embedding-3-small"'
        ),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to embed'),
      dimensions: z
        .number()
        .optional()
        .describe('Desired number of dimensions for the output embedding'),
      encodingFormat: z
        .enum(['float', 'base64'])
        .optional()
        .describe('Encoding format for the embeddings. Default: float')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            index: z.number().describe('Index of the embedding in the input array'),
            embedding: z.array(z.number()).describe('The embedding vector'),
            encodedEmbedding: z
              .string()
              .optional()
              .describe('Original base64 embedding when the provider returns base64 encoding')
          })
        )
        .describe('Array of generated embeddings'),
      model: z.string().describe('Model used for the embeddings'),
      promptTokens: z.number().describe('Number of tokens in the input'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.dimensions !== undefined &&
      (!Number.isInteger(ctx.input.dimensions) || ctx.input.dimensions < 1)
    ) {
      throw createApiServiceError('Embedding dimensions must be a positive whole number.');
    }
    let inputs = Array.isArray(ctx.input.input) ? ctx.input.input : [ctx.input.input];
    if (inputs.length === 0 || inputs.some(input => input.length === 0)) {
      throw createApiServiceError('Provide at least one non-empty text input to embed.');
    }
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createEmbedding({
      model: ctx.input.model,
      input: ctx.input.input,
      dimensions: ctx.input.dimensions,
      encodingFormat: ctx.input.encodingFormat
    });

    let embeddings = result.data.map(item => {
      if (Array.isArray(item.embedding)) {
        return { index: item.index, embedding: item.embedding };
      }
      let bytes = Buffer.from(item.embedding, 'base64');
      if (bytes.length === 0 || bytes.length % 4 !== 0) {
        throw createApiServiceError('AI/ML API returned an invalid base64 embedding.');
      }
      let embedding = Array.from({ length: bytes.length / 4 }, (_, index) =>
        bytes.readFloatLE(index * 4)
      );
      if (embedding.some(value => !Number.isFinite(value))) {
        throw createApiServiceError('AI/ML API returned an invalid embedding vector.');
      }
      return { index: item.index, embedding, encodedEmbedding: item.embedding };
    });

    let inputCount = Array.isArray(ctx.input.input) ? ctx.input.input.length : 1;

    return {
      output: {
        embeddings,
        model: result.model,
        promptTokens: result.usage.prompt_tokens,
        totalTokens: result.usage.total_tokens
      },
      message: `Generated **${embeddings.length}** embedding(s) for ${inputCount} input(s) using **${result.model}**. Dimensions: ${embeddings[0]?.embedding?.length ?? 'N/A'}. Tokens used: ${result.usage.total_tokens}.`
    };
  })
  .build();
