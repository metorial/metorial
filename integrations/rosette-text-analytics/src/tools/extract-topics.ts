import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractTopicsTool = SlateTool.create(spec, {
  name: 'Extract Topics',
  key: 'extract_topics',
  description: `Discovers central keywords and concepts from text. Unlike categorization or entity extraction, topic extraction is not constrained by a finite list. It identifies "keyphrases" (exact terms) and "concepts" (broader ideas) ranked by relative importance.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to extract topics from'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      keyphrases: z
        .array(
          z.object({
            phrase: z.string().describe('The keyphrase text'),
            salience: z.number().optional().describe('Relative importance score')
          })
        )
        .describe('Extracted keyphrases from the text'),
      concepts: z
        .array(
          z.object({
            phrase: z.string().describe('The concept text'),
            salience: z.number().optional().describe('Relative importance score')
          })
        )
        .describe('Extracted broader concepts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.extractTopics(ctx.input.content, ctx.input.language);

    let keyphrases = result.keyphrases ?? [];
    let concepts = result.concepts ?? [];

    return {
      output: {
        keyphrases,
        concepts
      },
      message: `Extracted **${keyphrases.length}** keyphrase${keyphrases.length === 1 ? '' : 's'} and **${concepts.length}** concept${concepts.length === 1 ? '' : 's'} from the text.`
    };
  })
  .build();
