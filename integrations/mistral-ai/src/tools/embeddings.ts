import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let embeddingDataSchema = z.object({
  index: z.number().describe('Index of the embedding in the input array'),
  embedding: z.array(z.number()).describe('Dense vector representation')
});

export let createEmbeddingsTool = SlateTool.create(spec, {
  name: 'Create Embeddings',
  key: 'create_embeddings',
  description: `Generate dense vector embeddings for text or code. Useful for semantic search, retrieval-augmented generation (RAG), clustering, and content similarity comparison. Supports both text embeddings (mistral-embed) and code embeddings (codestral-embed).`,
  instructions: [
    'Use "mistral-embed" for general text embeddings (1024 dimensions).',
    'Use "codestral-embed" for code-specific embeddings.',
    'You can provide a single string or an array of strings to embed multiple inputs at once.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .default('mistral-embed')
        .describe('Embedding model ID (e.g., "mistral-embed", "codestral-embed")'),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to embed'),
      encodingFormat: z
        .enum(['float', 'base64'])
        .optional()
        .describe('Output encoding format'),
      outputDimension: z
        .number()
        .optional()
        .describe('Custom embedding dimensionality (if supported by model)')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for embedding'),
      embeddings: z.array(embeddingDataSchema).describe('Generated embeddings'),
      usage: z.object({
        promptTokens: z.number().describe('Tokens processed'),
        totalTokens: z.number().describe('Total tokens used')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.createEmbeddings({
      model: ctx.input.model,
      input: ctx.input.input,
      encodingFormat: ctx.input.encodingFormat,
      outputDimension: ctx.input.outputDimension
    });

    let embeddings = (result.data || []).map((d: any) => ({
      index: d.index,
      embedding: d.embedding
    }));

    let inputCount = Array.isArray(ctx.input.input) ? ctx.input.input.length : 1;

    return {
      output: {
        model: result.model,
        embeddings,
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0
        }
      },
      message: `Generated ${embeddings.length} embedding(s) for ${inputCount} input(s) using **${result.model}** (${result.usage?.total_tokens || 0} tokens).`
    };
  })
  .build();
