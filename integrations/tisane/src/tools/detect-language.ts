import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectLanguage = SlateTool.create(spec, {
  name: 'Detect Language',
  key: 'detect_language',
  description: `Detects the languages used in a text fragment and returns a breakdown by offsets. Useful for identifying the language(s) of unknown text or multilingual content where different parts may be in different languages.`,
  instructions: [
    'Provide language code hints (pipe-separated like "en|fr|de") if you have a rough idea of the expected languages.',
    'Use a delimiter regex (e.g., "\\\\n") to segment the input for line-by-line language detection in multilingual text.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text fragment to detect languages for'),
      languageHints: z
        .string()
        .optional()
        .describe('Pipe-delimited language code hints (e.g., "en|fr|de") to narrow detection'),
      delimiter: z
        .string()
        .optional()
        .describe(
          'Regex delimiter for segmenting multi-line text (e.g., "\\\\n" for line-by-line detection)'
        )
    })
  )
  .output(
    z.object({
      languages: z
        .any()
        .describe(
          'Detected languages with offset breakdown showing which parts of text are in which language'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.detectLanguage(
      ctx.input.content,
      ctx.input.languageHints,
      ctx.input.delimiter
    );

    return {
      output: { languages: result },
      message: `Language detection completed.`
    };
  })
  .build();
