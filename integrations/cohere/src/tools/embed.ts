import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

export let embedTool = SlateTool.create(spec, {
  name: 'Embed Text',
  key: 'embed_text',
  description: `Generate text embeddings using Cohere's Embed models. Returns vector representations that capture semantic meaning, useful for semantic search, classification, clustering, and similarity comparisons. Supports configurable dimensionality and multiple output formats.`,
  instructions: [
    'Set "inputType" based on your use case: "search_document" for indexing, "search_query" for queries, "classification" for classifiers, "clustering" for grouping.',
    'Use "outputDimension" to control embedding size (256, 512, 1024, or 1536) — smaller dimensions are faster but less precise.'
  ],
  constraints: [
    'Maximum of 96 texts per request.',
    'Model must be a valid embedding model (e.g., "embed-v4.0", "embed-english-v3.0", "embed-multilingual-v3.0").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Embedding model to use (e.g., "embed-v4.0", "embed-english-v3.0")'),
      texts: z.array(z.string()).min(1).describe('Array of text strings to embed (max 96)'),
      inputType: z
        .enum(['search_document', 'search_query', 'classification', 'clustering'])
        .describe('Type of input — determines how embeddings are optimized'),
      embeddingTypes: z
        .array(z.enum(['float', 'int8', 'uint8', 'binary', 'ubinary']))
        .optional()
        .describe('Embedding formats to return (defaults to float)'),
      outputDimension: z
        .number()
        .optional()
        .describe('Embedding dimensions: 256, 512, 1024, or 1536 (for embed-v4 and newer)'),
      truncate: z
        .enum(['NONE', 'START', 'END'])
        .optional()
        .describe('How to handle inputs exceeding max token length')
    })
  )
  .output(
    z.object({
      embeddingId: z.string().describe('Unique identifier for this embedding response'),
      embeddings: z
        .record(z.string(), z.array(z.array(z.number())))
        .describe(
          'Embeddings keyed by type (e.g., "float"), each containing arrays of numbers'
        ),
      texts: z.array(z.string()).optional().describe('The input texts that were embedded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.embed({
      model: ctx.input.model,
      texts: ctx.input.texts,
      inputType: ctx.input.inputType,
      embeddingTypes: ctx.input.embeddingTypes,
      outputDimension: ctx.input.outputDimension,
      truncate: ctx.input.truncate
    });

    let embeddings = result.embeddings || {};

    return {
      output: {
        embeddingId: result.id || '',
        embeddings,
        texts: result.texts
      },
      message: `Generated embeddings for **${ctx.input.texts.length}** text(s) using **${ctx.input.model}**.`
    };
  })
  .build();
