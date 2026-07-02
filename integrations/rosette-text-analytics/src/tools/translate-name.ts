import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let translateNameTool = SlateTool.create(spec, {
  name: 'Translate Name',
  key: 'translate_name',
  description: `Translates a name from one language to another, using knowledge of language-specific naming conventions. Recognizes when to transliterate a name phonetically vs. translate meaning (e.g., titles). Supports 13 source languages to English, and translation between Chinese, Japanese, and Korean.`,
  instructions: [
    'Set maximumResults to receive multiple translation variants.',
    'Use entityType to guide translation rules (person names vs. location names).'
  ],
  constraints: ['Maximum name length is 500 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('The name to translate'),
      targetLanguage: z
        .string()
        .describe('ISO 639-3 target language code (e.g., "eng" for English)'),
      entityType: z
        .enum(['PERSON', 'LOCATION', 'ORGANIZATION'])
        .optional()
        .describe('Entity type of the name'),
      sourceLanguageOfOrigin: z
        .string()
        .optional()
        .describe("ISO 639-3 code for the name's language of origin"),
      sourceLanguageOfUse: z
        .string()
        .optional()
        .describe('ISO 639-3 code for the language context in which the name is used'),
      sourceScript: z.string().optional().describe('ISO 15924 script code of the source name'),
      targetScript: z
        .string()
        .optional()
        .describe('ISO 15924 script code for the translated name'),
      targetScheme: z.string().optional().describe('Transliteration scheme to use'),
      maximumResults: z
        .number()
        .optional()
        .describe('Maximum number of translation variants to return')
    })
  )
  .output(
    z.object({
      translations: z
        .array(
          z.object({
            translation: z.string().describe('The translated name'),
            confidence: z.number().optional().describe('Confidence score')
          })
        )
        .describe('Name translation results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.nameTranslation({
      name: ctx.input.name,
      targetLanguage: ctx.input.targetLanguage,
      entityType: ctx.input.entityType,
      sourceLanguageOfOrigin: ctx.input.sourceLanguageOfOrigin,
      sourceLanguageOfUse: ctx.input.sourceLanguageOfUse,
      sourceScript: ctx.input.sourceScript,
      targetScript: ctx.input.targetScript,
      targetScheme: ctx.input.targetScheme,
      maximumResults: ctx.input.maximumResults
    });

    let translations = result.translations ?? [];

    return {
      output: {
        translations
      },
      message:
        translations.length > 0
          ? `Translated "${ctx.input.name}" to: **${translations[0].translation}**${translations.length > 1 ? ` (and ${translations.length - 1} other variant${translations.length > 2 ? 's' : ''})` : ''}.`
          : `No translation available for "${ctx.input.name}".`
    };
  })
  .build();
