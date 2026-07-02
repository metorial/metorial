import { SlateTool } from 'slates';
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
            embedding: z.array(z.number()).describe('The embedding vector')
          })
        )
        .describe('Array of generated embeddings'),
      model: z.string().describe('Model used for the embeddings'),
      promptTokens: z.number().describe('Number of tokens in the input'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
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

    let embeddings = result.data.map(item => ({
      index: item.index,
      embedding: item.embedding
    }));

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
