import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let semanticSimilarity = SlateTool.create(spec, {
  name: 'Semantic Similarity',
  key: 'semantic_similarity',
  description: `Calculates the semantic similarity between two text fragments, returning a score between 0 (completely different) and 1 (identical meaning). Supports cross-language comparison, allowing you to compare texts written in different languages.`,
  instructions: [
    'Both text fragments require a language code. Use the same code for same-language comparison or different codes for cross-language comparison.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language1: z
        .string()
        .describe('IETF language code for the first text fragment (e.g., "en")'),
      content1: z.string().describe('First text fragment'),
      language2: z
        .string()
        .describe('IETF language code for the second text fragment (e.g., "fr")'),
      content2: z.string().describe('Second text fragment')
    })
  )
  .output(
    z.object({
      similarityScore: z
        .number()
        .describe(
          'Semantic similarity score between 0 (no similarity) and 1 (identical meaning)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let score = await client.similarity(
      ctx.input.language1,
      ctx.input.content1,
      ctx.input.language2,
      ctx.input.content2
    );

    return {
      output: { similarityScore: score },
      message: `Semantic similarity score: **${score}** (0 = no similarity, 1 = identical meaning).`
    };
  })
  .build();
