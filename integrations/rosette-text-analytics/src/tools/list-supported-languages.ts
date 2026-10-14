import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let languagePairSideSchema = z.object({
  language: z.string().optional().describe('ISO 639-3 language code'),
  script: z.string().optional().describe('ISO 15924 script code'),
  transliterationScheme: z.string().optional().describe('Supported transliteration scheme')
});

type LanguagePairSide = {
  language?: string | null;
  script?: string | null;
  transliterationScheme?: string | null;
};

export let listSupportedLanguagesTool = SlateTool.create(spec, {
  name: 'List Supported Languages',
  key: 'list_supported_languages',
  description:
    'Lists supported language and script combinations or source/target language pairs, including their license status, for a selected Analytics API endpoint. Use this before selecting a language for text analysis or name matching.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      endpoint: z
        .enum([
          'language',
          'entities',
          'sentiment',
          'name-similarity',
          'name-translation',
          'name-deduplication',
          'semantics/vector',
          'syntax/dependencies',
          'transliteration'
        ])
        .describe('Endpoint whose supported languages to retrieve')
    })
  )
  .output(
    z.object({
      supportedLanguages: z
        .array(
          z.object({
            language: z.string().optional().describe('ISO 639-3 language code'),
            script: z.string().optional().describe('ISO 15924 script code'),
            licensed: z
              .boolean()
              .optional()
              .describe('Whether the language is licensed for this installation')
          })
        )
        .describe('Supported language and script combinations'),
      supportedLanguagePairs: z
        .array(
          z.object({
            source: languagePairSideSchema
              .optional()
              .describe('Source language, script, and transliteration scheme'),
            target: languagePairSideSchema
              .optional()
              .describe('Target language, script, and transliteration scheme'),
            licensed: z
              .boolean()
              .optional()
              .describe('Whether this language pair is licensed for the installation')
          })
        )
        .optional()
        .describe(
          'Supported source/target pairs returned by name matching and name translation'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.supportedLanguages(ctx.input.endpoint);
    if (
      !Array.isArray(result.supportedLanguages) &&
      !Array.isArray(result.supportedLanguagePairs)
    ) {
      throw createApiServiceError(
        'The Analytics API did not return supported languages or language pairs.'
      );
    }
    let supportedLanguages = (
      Array.isArray(result.supportedLanguages) ? result.supportedLanguages : []
    ).map(
      (language: {
        language?: string | null;
        script?: string | null;
        licensed?: boolean | null;
      }) => ({
        language: language.language ?? undefined,
        script: language.script ?? undefined,
        licensed: language.licensed ?? undefined
      })
    );
    let supportedLanguagePairs = (
      Array.isArray(result.supportedLanguagePairs) ? result.supportedLanguagePairs : []
    ).map(
      (pair: {
        source?: LanguagePairSide | null;
        target?: LanguagePairSide | null;
        licensed?: boolean | null;
      }) => ({
        source: pair.source
          ? {
              language: pair.source.language ?? undefined,
              script: pair.source.script ?? undefined,
              transliterationScheme: pair.source.transliterationScheme ?? undefined
            }
          : undefined,
        target: pair.target
          ? {
              language: pair.target.language ?? undefined,
              script: pair.target.script ?? undefined,
              transliterationScheme: pair.target.transliterationScheme ?? undefined
            }
          : undefined,
        licensed: pair.licensed ?? undefined
      })
    );
    return {
      output: { supportedLanguages, supportedLanguagePairs },
      message: `Retrieved ${supportedLanguages.length} supported language and script combinations and ${supportedLanguagePairs.length} source/target language pairs for ${ctx.input.endpoint}.`
    };
  })
  .build();
