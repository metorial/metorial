import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let detectedLocaleSchema = z.object({
  locale: z.string().describe('Detected locale code (e.g., "fr_XX", "en_XX")'),
  confidence: z.number().describe('Confidence score between 0 and 1')
});

export let detectLanguage = SlateTool.create(spec, {
  name: 'Detect Language',
  key: 'detect_language',
  description: `Detect the language of a given text. Returns the N-best detected locales with confidence scores. Useful for routing multilingual inputs or selecting the correct NLP model.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text for which to detect the language'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of detected locales to return')
    })
  )
  .output(
    z.object({
      detectedLocales: z
        .array(detectedLocaleSchema)
        .describe('List of detected locales sorted by confidence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.detectLanguage(ctx.input.text, ctx.input.maxResults);

    let locales = result.detected_locales ?? [];

    let topLocale = locales.length > 0 ? locales[0].locale : 'unknown';

    return {
      output: {
        detectedLocales: locales
      },
      message: `Detected **${locales.length}** locale(s) for the provided text. Top result: **${topLocale}**.`
    };
  })
  .build();
