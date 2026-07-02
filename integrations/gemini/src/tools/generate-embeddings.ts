import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let generateEmbeddings = SlateTool.create(spec, {
  name: 'Generate Embeddings',
  key: 'generate_embeddings',
  description: `Generate vector embeddings for text content using Gemini embedding models. Supports single and batch embedding generation with configurable task type and dimensionality. Useful for semantic search, classification, and clustering.`,
  instructions: [
    'Use "gemini-embedding-2" as the current Gemini embedding model.',
    'For "gemini-embedding-001", set taskType to optimize embeddings for your use case. For "gemini-embedding-2", put task instructions directly in the text instead of using taskType.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Embedding model ID (e.g. "gemini-embedding-2")'),
      texts: z
        .array(z.string())
        .min(1)
        .describe('Array of text strings to generate embeddings for'),
      taskType: z
        .enum([
          'RETRIEVAL_QUERY',
          'RETRIEVAL_DOCUMENT',
          'SEMANTIC_SIMILARITY',
          'CLASSIFICATION',
          'CLUSTERING',
          'QUESTION_ANSWERING',
          'FACT_VERIFICATION',
          'CODE_RETRIEVAL_QUERY'
        ])
        .optional()
        .describe(
          'Task type to optimize the embeddings for. This is only sent for gemini-embedding-001; gemini-embedding-2 expects task instructions in the text.'
        ),
      title: z
        .string()
        .optional()
        .describe(
          'Title for the content. This is only sent for gemini-embedding-001 with RETRIEVAL_DOCUMENT task type.'
        ),
      outputDimensionality: z
        .number()
        .optional()
        .describe('Desired embedding dimension. Smaller dimensions reduce storage cost.')
    })
  )
  .output(
    z.object({
      embeddings: z
        .array(
          z.object({
            values: z.array(z.number()).describe('The embedding vector')
          })
        )
        .describe('Generated embeddings, one per input text')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.texts.length === 1) {
      let result = await client.embedContent(ctx.input.model, {
        content: { parts: [{ text: ctx.input.texts[0] }] },
        taskType: ctx.input.taskType,
        title: ctx.input.title,
        outputDimensionality: ctx.input.outputDimensionality
      });

      return {
        output: {
          embeddings: [{ values: result.embedding.values }]
        },
        message: `Generated 1 embedding using **${ctx.input.model}** with ${result.embedding.values.length} dimensions.`
      };
    }

    let result = await client.batchEmbedContents(ctx.input.model, {
      requests: ctx.input.texts.map(text => ({
        content: { parts: [{ text }] },
        taskType: ctx.input.taskType,
        title: ctx.input.title,
        outputDimensionality: ctx.input.outputDimensionality
      }))
    });

    let embeddings = result.embeddings.map((e: any) => ({ values: e.values }));

    return {
      output: { embeddings },
      message: `Generated ${embeddings.length} embeddings using **${ctx.input.model}** with ${embeddings[0]?.values?.length ?? 0} dimensions each.`
    };
  })
  .build();
