import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectLanguageTool = SlateTool.create(spec, {
  name: 'Detect Language',
  key: 'detect_language',
  description: `Identifies the language of a given text. Supports detection across 55 languages. Can optionally use multilingual detection mode to identify language regions within the same document, useful when text contains multiple languages.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to identify the language of'),
      multilingual: z
        .boolean()
        .optional()
        .describe(
          'Enable multilingual detection to identify language regions within the same document'
        )
    })
  )
  .output(
    z.object({
      languageDetections: z
        .array(
          z.object({
            language: z.string().describe('ISO 639-3 language code'),
            confidence: z.number().describe('Confidence score between 0 and 1')
          })
        )
        .describe('Detected languages ordered by confidence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let options: Record<string, unknown> = {};
    if (ctx.input.multilingual) {
      options.options = { multilingual: true };
    }

    let result = await client.detectLanguage(ctx.input.content, options);

    let detections = result.languageDetections ?? [];

    return {
      output: {
        languageDetections: detections
      },
      message:
        detections.length > 0
          ? `Detected **${detections[0].language}** with ${(detections[0].confidence * 100).toFixed(1)}% confidence${detections.length > 1 ? ` (and ${detections.length - 1} other possible language${detections.length > 2 ? 's' : ''})` : ''}.`
          : 'No language could be detected from the provided text.'
    };
  })
  .build();
