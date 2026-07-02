import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEmbedding = SlateTool.create(spec, {
  name: 'Create Embedding',
  key: 'create_embedding',
  description: `Generate vector embeddings for text input using OpenRouter's embedding models. Supports single texts or batches. Embeddings capture semantic meaning and can be used for similarity search, clustering, and classification tasks.`,
  instructions: [
    'Use embedding model IDs like "openai/text-embedding-3-small" or "openai/text-embedding-ada-002".',
    'Pass a single string or an array of strings for batch processing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Embedding model ID (e.g., "openai/text-embedding-3-small")'),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Text to embed — a single string or an array of strings for batch processing'
        )
    })
  )
  .output(
    z.object({
      model: z.string().optional().describe('Model used for embedding'),
      embeddings: z
        .array(
          z.object({
            index: z.number().describe('Index of the embedding in the batch'),
            embedding: z.array(z.number()).describe('The embedding vector')
          })
        )
        .describe('Array of embedding results'),
      usage: z
        .object({
          promptTokens: z.number().describe('Number of tokens in the input'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .optional()
        .describe('Token usage statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.createEmbedding({
      model: ctx.input.model,
      input: ctx.input.input ?? ''
    });

    let rawData = (result.data as Record<string, unknown>[]) || [];
    let embeddings = rawData.map((item: Record<string, unknown>) => ({
      index: (item.index as number) || 0,
      embedding: (item.embedding as number[]) || []
    }));

    let usage = result.usage as Record<string, unknown> | undefined;

    return {
      output: {
        model: (result.model as string) || undefined,
        embeddings,
        ...(usage
          ? {
              usage: {
                promptTokens: (usage.prompt_tokens as number) || 0,
                totalTokens: (usage.total_tokens as number) || 0
              }
            }
          : {})
      },
      message: `Generated ${embeddings.length} embedding(s) using **${result.model || ctx.input.model}**.`
    };
  })
  .build();
