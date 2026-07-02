import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractKeywords = SlateTool.create(spec, {
  name: 'Extract Keywords',
  key: 'extract_keywords',
  description: `Identify and extract significant keywords from text using Metatext AI's pre-built keyword extraction model. Useful for content indexing, tag generation, SEO optimization, and summarizing key topics in documents or articles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to extract keywords from')
    })
  )
  .output(
    z.object({
      predictions: z
        .array(
          z.object({
            label: z.string().describe('The extracted keyword or keyphrase'),
            score: z.number().describe('Relevance score for the keyword')
          })
        )
        .describe('List of extracted keywords with relevance scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.extractKeywords(ctx.input.text);

    return {
      output: result,
      message: `Extracted keywords from the provided text.`
    };
  })
  .build();
