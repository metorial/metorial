import { SlateTool } from 'slates';
import { z } from 'zod';
import { DictionaryClient } from '../lib/client';
import { spec } from '../spec';

let definitionSchema = z.object({
  definition: z.string().describe('The definition text'),
  example: z.string().optional().describe('Example sentence demonstrating usage'),
  synonyms: z.array(z.string()).describe('Synonyms for this specific definition'),
  antonyms: z.array(z.string()).describe('Antonyms for this specific definition')
});

let meaningSchema = z.object({
  partOfSpeech: z.string().describe('Part of speech (e.g., noun, verb, adjective)'),
  definitions: z.array(definitionSchema).describe('Definitions for this part of speech'),
  synonyms: z.array(z.string()).describe('General synonyms for this part of speech'),
  antonyms: z.array(z.string()).describe('General antonyms for this part of speech')
});

let phoneticSchema = z.object({
  text: z.string().optional().describe('IPA phonetic transcription'),
  audioUrl: z.string().optional().describe('URL to audio pronunciation file')
});

let entrySchema = z.object({
  word: z.string().describe('The looked-up word'),
  phonetic: z.string().optional().describe('Primary phonetic transcription'),
  phonetics: z
    .array(phoneticSchema)
    .describe('All available phonetic transcriptions and audio'),
  meanings: z.array(meaningSchema).describe('Meanings grouped by part of speech'),
  sourceUrls: z.array(z.string()).describe('Source URLs for the word data')
});

export let lookUpWord = SlateTool.create(spec, {
  name: 'Look Up Word',
  key: 'look_up_word',
  description: `Look up a word in the dictionary to get its full definition, including all meanings grouped by part of speech, example sentences, phonetics, synonyms, and antonyms. Supports multiple languages by specifying a language code.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      word: z.string().describe('The word to look up'),
      languageCode: z
        .string()
        .optional()
        .describe(
          'Language code override (e.g., "en", "fr", "es"). Uses the configured default if not specified.'
        )
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).describe('Dictionary entries for the word')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DictionaryClient({
      languageCode: ctx.config.languageCode
    });

    let entries = await client.lookupWord(ctx.input.word, ctx.input.languageCode);

    let mappedEntries = entries.map(entry => ({
      word: entry.word,
      phonetic: entry.phonetic,
      phonetics: entry.phonetics.map(p => ({
        text: p.text,
        audioUrl: p.audio || undefined
      })),
      meanings: entry.meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.map(d => ({
          definition: d.definition,
          example: d.example,
          synonyms: d.synonyms,
          antonyms: d.antonyms
        })),
        synonyms: m.synonyms,
        antonyms: m.antonyms
      })),
      sourceUrls: entry.sourceUrls || []
    }));

    let totalMeanings = mappedEntries.reduce((sum, e) => sum + e.meanings.length, 0);
    let totalDefinitions = mappedEntries.reduce(
      (sum, e) => sum + e.meanings.reduce((s, m) => s + m.definitions.length, 0),
      0
    );

    return {
      output: { entries: mappedEntries },
      message: `Found **${mappedEntries.length}** entr${mappedEntries.length === 1 ? 'y' : 'ies'} for "${ctx.input.word}" with **${totalMeanings}** part${totalMeanings === 1 ? '' : 's'} of speech and **${totalDefinitions}** definition${totalDefinitions === 1 ? '' : 's'}.`
    };
  })
  .build();
