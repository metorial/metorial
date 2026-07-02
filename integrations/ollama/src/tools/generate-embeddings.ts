import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { modelOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings from text using a specified embedding model. Supports single or batch text inputs. Useful for semantic search, clustering, and retrieval-augmented generation (RAG) applications.`,
  instructions: [
    'Use an embedding model such as "nomic-embed-text" or "all-minilm".',
    'Pass a single string or an array of strings as **input** for batch embedding.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Name of the embedding model to use (e.g., "nomic-embed-text").'),
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to generate embeddings for.'),
      truncate: z
        .boolean()
        .optional()
        .describe('Automatically truncate inputs exceeding context limits. Defaults to true.'),
      dimensions: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Desired embedding vector dimensions.'),
      keepAlive: z
        .string()
        .optional()
        .describe('How long to keep the model loaded (e.g., "5m", "1h").'),
      options: modelOptionsSchema
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for embedding generation.'),
      embeddings: z
        .array(z.array(z.number()))
        .describe('Array of embedding vectors (one per input text).'),
      totalDuration: z.number().optional().describe('Total time in nanoseconds.'),
      promptEvalCount: z.number().optional().describe('Number of input tokens processed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.embed({
      model: ctx.input.model,
      input: ctx.input.input,
      truncate: ctx.input.truncate,
      dimensions: ctx.input.dimensions,
      keepAlive: ctx.input.keepAlive,
      options: ctx.input.options
    });

    let count = result.embeddings.length;
    let dims = result.embeddings[0]?.length || 0;

    return {
      output: {
        model: result.model,
        embeddings: result.embeddings,
        totalDuration: result.totalDuration,
        promptEvalCount: result.promptEvalCount
      },
      message: `Generated **${count}** embedding(s) with **${dims}** dimensions using **${result.model}**.`
    };
  })
  .build();
