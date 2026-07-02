import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let categorizeTextTool = SlateTool.create(spec, {
  name: 'Categorize Text',
  key: 'categorize_text',
  description: `Classifies text content under topic categories drawn from the IAB Quality Assurance Guidelines Taxonomy (Tier 1 contextual categories). Useful for automatically tagging documents, web pages, or articles by topic.`,
  constraints: [
    'Currently focused on English-language text.',
    'Maximum payload size is 600KB with a maximum of 50,000 characters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to categorize'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            label: z.string().describe('Category label from IAB taxonomy'),
            confidence: z.number().describe('Confidence score between 0 and 1')
          })
        )
        .describe('Assigned categories ordered by confidence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.categorize(ctx.input.content, ctx.input.language);

    let categories = result.categories ?? [];

    return {
      output: {
        categories
      },
      message:
        categories.length > 0
          ? `Categorized text under **${categories[0].label}** (${(categories[0].confidence * 100).toFixed(1)}% confidence)${categories.length > 1 ? ` and ${categories.length - 1} other categor${categories.length > 2 ? 'ies' : 'y'}` : ''}.`
          : 'No categories could be determined for the provided text.'
    };
  })
  .build();
