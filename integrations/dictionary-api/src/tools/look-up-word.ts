import { SlateTool } from 'slates';
import { z } from 'zod';
import { DictionaryClient, getPronunciationAudioUrl } from '../lib/client';
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
  origin: z.string().optional().describe('Word origin or etymology, when available'),
  phonetics: z
    .array(phoneticSchema)
    .describe('All available phonetic transcriptions and audio'),
  meanings: z.array(meaningSchema).describe('Meanings grouped by part of speech'),
  sourceUrls: z.array(z.string()).describe('Source URLs for the word data')
});

export let lookUpWord = SlateTool.create(spec, {
  name: 'Look Up Word',
  key: 'look_up_word',
  description: `Look up a word in the Free Dictionary API to get definitions, meanings grouped by part of speech, example sentences, phonetics, synonyms, antonyms, and available word origins. Pronunciation recordings are available as downloadable audio when provided.`,
  constraints: [
    'English uses language code en. Availability of other language codes depends on the provider.',
    'Pronunciations, examples, origins, synonyms, and antonyms are not available for every word.'
  ],
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
          'Language code override, such as "en" for English. Uses the configured default when omitted; availability depends on the provider.'
        )
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).describe('Dictionary entries for the word'),
      rawEntries: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Original provider entries, including available source and license metadata')
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
      origin: entry.origin,
      phonetics: entry.phonetics.map(p => ({
        text: p.text,
        audioUrl: getPronunciationAudioUrl(p.audio)
      })),
      meanings: entry.meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.map(d => ({
          definition: d.definition,
          example: d.example,
          synonyms: d.synonyms,
          antonyms: d.antonyms
        })),
        synonyms: m.synonyms ?? [],
        antonyms: m.antonyms ?? []
      })),
      sourceUrls: entry.sourceUrls ?? []
    }));

    let audioUrls = new Set(
      mappedEntries.flatMap(entry =>
        entry.phonetics.flatMap(phonetic => (phonetic.audioUrl ? [phonetic.audioUrl] : []))
      )
    );
    for (let url of audioUrls) {
      await ctx.addAttachment({ type: 'url', url });
    }

    let totalMeanings = mappedEntries.reduce((sum, e) => sum + e.meanings.length, 0);
    let totalDefinitions = mappedEntries.reduce(
      (sum, e) => sum + e.meanings.reduce((s, m) => s + m.definitions.length, 0),
      0
    );

    return {
      output: { entries: mappedEntries, rawEntries: entries },
      message: `Found **${mappedEntries.length}** entr${mappedEntries.length === 1 ? 'y' : 'ies'} for "${ctx.input.word}" with **${totalMeanings}** part${totalMeanings === 1 ? '' : 's'} of speech and **${totalDefinitions}** definition${totalDefinitions === 1 ? '' : 's'}.`
    };
  })
  .build();
