import { SlateTool } from 'slates';
import { z } from 'zod';
import { DictionaryClient } from '../lib/client';
import { spec } from '../spec';

let partOfSpeechGroupSchema = z.object({
  partOfSpeech: z.string().describe('Part of speech (e.g., noun, verb, adjective)'),
  synonyms: z.array(z.string()).describe('Synonyms for this part of speech'),
  antonyms: z.array(z.string()).describe('Antonyms for this part of speech')
});

export let getSynonymsAntonyms = SlateTool.create(spec, {
  name: 'Get Synonyms & Antonyms',
  key: 'get_synonyms_antonyms',
  description: `Retrieve synonyms and antonyms for a word, grouped by part of speech. Collects synonyms and antonyms from both the meaning level and individual definition level, returning a deduplicated list per part of speech.`,
  constraints: [
    'Not all words have synonyms or antonyms available. Results may be empty for some words or parts of speech.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      word: z.string().describe('The word to find synonyms and antonyms for'),
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
      word: z.string().describe('The looked-up word'),
      groups: z
        .array(partOfSpeechGroupSchema)
        .describe('Synonyms and antonyms grouped by part of speech')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DictionaryClient({
      languageCode: ctx.config.languageCode
    });

    let entries = await client.lookupWord(ctx.input.word, ctx.input.languageCode);

    let groupMap = new Map<string, { synonyms: Set<string>; antonyms: Set<string> }>();

    for (let entry of entries) {
      for (let meaning of entry.meanings) {
        let existing = groupMap.get(meaning.partOfSpeech);
        if (!existing) {
          existing = { synonyms: new Set(), antonyms: new Set() };
          groupMap.set(meaning.partOfSpeech, existing);
        }

        for (let syn of meaning.synonyms) existing.synonyms.add(syn);
        for (let ant of meaning.antonyms) existing.antonyms.add(ant);

        for (let def of meaning.definitions) {
          for (let syn of def.synonyms) existing.synonyms.add(syn);
          for (let ant of def.antonyms) existing.antonyms.add(ant);
        }
      }
    }

    let groups = Array.from(groupMap.entries()).map(
      ([partOfSpeech, { synonyms, antonyms }]) => ({
        partOfSpeech,
        synonyms: Array.from(synonyms),
        antonyms: Array.from(antonyms)
      })
    );

    let totalSynonyms = groups.reduce((sum, g) => sum + g.synonyms.length, 0);
    let totalAntonyms = groups.reduce((sum, g) => sum + g.antonyms.length, 0);

    return {
      output: {
        word: ctx.input.word,
        groups
      },
      message: `Found **${totalSynonyms}** synonym${totalSynonyms === 1 ? '' : 's'} and **${totalAntonyms}** antonym${totalAntonyms === 1 ? '' : 's'} for "${ctx.input.word}" across **${groups.length}** part${groups.length === 1 ? '' : 's'} of speech.`
    };
  })
  .build();
