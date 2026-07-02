import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let createEmbeddings = SlateTool.create(spec, {
  name: 'Create Embeddings',
  key: 'create_embeddings',
  description: `Generate vector embeddings from text using embedding models from multiple providers. Useful for semantic search, text clustering, similarity comparison, and retrieval-augmented generation workflows.`,
  instructions: [
    'Use "text-embedding-3-small" for a cost-effective general-purpose embedding model.',
    'Use "text-embedding-3-large" for higher quality embeddings when accuracy is critical.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Embedding model identifier (e.g., "text-embedding-3-small", "text-embedding-3-large")'
        ),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text to embed. Can be a single string or an array of strings.'),
      encodingFormat: z.enum(['float', 'np']).optional().describe('Output encoding format'),
      dimensions: z
        .number()
        .optional()
        .describe('Number of output vector dimensions (up to 1536)')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            index: z.number().describe('Index of the embedding in the input array'),
            vector: z.array(z.number()).describe('The embedding vector')
          })
        )
        .describe('Generated embedding vectors'),
      model: z.string().describe('The embedding model used'),
      promptTokens: z.number().describe('Number of tokens in the input'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createEmbeddings({
      model: ctx.input.model,
      input: ctx.input.input,
      encodingFormat: ctx.input.encodingFormat,
      dimensions: ctx.input.dimensions
    });

    let embeddings = (result.data ?? []).map((item: any) => ({
      index: item.index,
      vector: item.embedding
    }));

    let inputCount = Array.isArray(ctx.input.input) ? ctx.input.input.length : 1;

    return {
      output: {
        embeddings,
        model: result.model,
        promptTokens: result.usage?.prompt_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0
      },
      message: `Generated **${embeddings.length}** embedding${embeddings.length !== 1 ? 's' : ''} using **${result.model}** for ${inputCount} input${inputCount !== 1 ? 's' : ''}. ${result.usage?.total_tokens ?? 0} tokens used. Vector dimension: ${embeddings[0]?.vector?.length ?? 'N/A'}.`
    };
  })
  .build();
