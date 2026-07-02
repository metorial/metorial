import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

let embedInputSchema = z.object({
  content: z
    .array(z.record(z.string(), z.any()))
    .min(1)
    .describe('Mixed Cohere input content blocks, such as text and image_url blocks')
});

export let embedTool = SlateTool.create(spec, {
  name: 'Embed Content',
  key: 'embed_text',
  description: `Generate embeddings using Cohere's Embed models for text, image data URIs, or mixed text/image inputs. Returns vector representations useful for semantic search, classification, clustering, and similarity comparisons. Supports configurable dimensionality and multiple output formats.`,
  instructions: [
    'Set "inputType" based on your use case: "search_document" for indexing, "search_query" for queries, "classification" for classifiers, "clustering" for grouping.',
    'Provide exactly one of "texts", "images", or "inputs". Use "inputType": "image" for image-only embeddings.',
    'Use "outputDimension" to control embedding size (256, 512, 1024, or 1536) — smaller dimensions are faster but less precise.'
  ],
  constraints: [
    'Maximum of 96 texts or mixed inputs per request, or 1 image data URI per request.',
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
      texts: z
        .array(z.string())
        .min(1)
        .max(96)
        .optional()
        .describe(
          'Array of text strings to embed (max 96). Provide exactly one input source.'
        ),
      images: z
        .array(z.string())
        .min(1)
        .max(1)
        .optional()
        .describe(
          'Array containing one image data URI to embed. Provide exactly one input source.'
        ),
      inputs: z
        .array(embedInputSchema)
        .min(1)
        .max(96)
        .optional()
        .describe(
          'Array of mixed Cohere inputs containing text and image components. Provide exactly one input source.'
        ),
      inputType: z
        .enum(['search_document', 'search_query', 'classification', 'clustering', 'image'])
        .describe('Type of input — determines how embeddings are optimized'),
      embeddingTypes: z
        .array(z.enum(['float', 'int8', 'uint8', 'binary', 'ubinary', 'base64']))
        .optional()
        .describe('Embedding formats to return (defaults to float)'),
      outputDimension: z
        .number()
        .optional()
        .describe('Embedding dimensions: 256, 512, 1024, or 1536 (for embed-v4 and newer)'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum tokens to embed per input before truncation'),
      truncate: z
        .enum(['NONE', 'START', 'END'])
        .optional()
        .describe('How to handle inputs exceeding max token length'),
      priority: z
        .number()
        .int()
        .min(0)
        .max(999)
        .optional()
        .describe('Cohere request priority. Lower numbers are handled earlier.')
    })
  )
  .output(
    z.object({
      embeddingId: z.string().describe('Unique identifier for this embedding response'),
      embeddings: z
        .record(z.string(), z.any())
        .describe('Embeddings keyed by type (e.g., "float", "int8", "base64")'),
      texts: z.array(z.string()).optional().describe('The input texts that were embedded'),
      images: z.array(z.any()).optional().describe('The input images that were embedded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });
    let inputSourceCount = [ctx.input.texts, ctx.input.images, ctx.input.inputs].filter(
      value => value !== undefined
    ).length;

    if (inputSourceCount !== 1) {
      throw createApiServiceError('Provide exactly one of texts, images, or inputs.');
    }

    let result = await client.embed({
      model: ctx.input.model,
      texts: ctx.input.texts,
      images: ctx.input.images,
      inputs: ctx.input.inputs,
      inputType: ctx.input.inputType,
      embeddingTypes: ctx.input.embeddingTypes,
      outputDimension: ctx.input.outputDimension,
      maxTokens: ctx.input.maxTokens,
      truncate: ctx.input.truncate,
      priority: ctx.input.priority
    });

    let embeddings = result.embeddings || {};

    return {
      output: {
        embeddingId: result.id || '',
        embeddings,
        texts: result.texts,
        images: result.images
      },
      message: `Generated embeddings for **${(ctx.input.texts ?? ctx.input.images ?? ctx.input.inputs ?? []).length}** input(s) using **${ctx.input.model}**.`
    };
  })
  .build();
