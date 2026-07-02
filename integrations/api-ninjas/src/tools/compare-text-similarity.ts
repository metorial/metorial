import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compareTextSimilarity = SlateTool.create(spec, {
  name: 'Compare Text Similarity',
  key: 'compare_text_similarity',
  description: `Compare two text passages and get a similarity score using AI-powered NLP. Returns a score between 0 (completely different) and 1 (identical). Uses 768-dimensional vector embeddings and cosine similarity.`,
  constraints: ['Maximum 5000 characters per text input.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      textA: z.string().describe('First text passage to compare (max 5000 characters)'),
      textB: z.string().describe('Second text passage to compare (max 5000 characters)')
    })
  )
  .output(
    z.object({
      similarity: z
        .number()
        .describe('Similarity score from 0 (completely different) to 1 (identical)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTextSimilarity(ctx.input.textA, ctx.input.textB);

    let percentage = (result.similarity * 100).toFixed(1);

    return {
      output: {
        similarity: result.similarity
      },
      message: `Text similarity: **${percentage}%** (${result.similarity})`
    };
  })
  .build();
