import { SlateTool } from 'slates';
import { z } from 'zod';
import { DictionaryClient } from '../lib/client';
import { spec } from '../spec';

let phoneticEntrySchema = z.object({
  text: z.string().optional().describe('IPA phonetic transcription'),
  audioUrl: z.string().optional().describe('URL to audio pronunciation file'),
  sourceUrl: z.string().optional().describe('Source URL for this phonetic entry')
});

export let getPhonetics = SlateTool.create(spec, {
  name: 'Get Phonetics',
  key: 'get_phonetics',
  description: `Retrieve phonetic transcriptions and audio pronunciation URLs for a word. Returns IPA text representations and links to audio files where available. Useful for language learning and pronunciation reference.`,
  constraints: [
    'Not all words or languages have audio pronunciation available.',
    'Phonetic text may not be available for every entry.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      word: z.string().describe('The word to get phonetics for'),
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
      primaryPhonetic: z.string().optional().describe('Primary phonetic transcription'),
      phonetics: z
        .array(phoneticEntrySchema)
        .describe('All available phonetic entries with transcriptions and audio URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DictionaryClient({
      languageCode: ctx.config.languageCode
    });

    let entries = await client.lookupWord(ctx.input.word, ctx.input.languageCode);

    let allPhonetics: Array<{ text?: string; audioUrl?: string; sourceUrl?: string }> = [];
    let primaryPhonetic: string | undefined;

    for (let entry of entries) {
      if (entry.phonetic && !primaryPhonetic) {
        primaryPhonetic = entry.phonetic;
      }

      for (let p of entry.phonetics) {
        allPhonetics.push({
          text: p.text,
          audioUrl: p.audio || undefined,
          sourceUrl: p.sourceUrl
        });
      }
    }

    // Deduplicate phonetics by text + audioUrl combination
    let seen = new Set<string>();
    let uniquePhonetics = allPhonetics.filter(p => {
      let key = `${p.text || ''}|${p.audioUrl || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let audioCount = uniquePhonetics.filter(p => p.audioUrl).length;

    return {
      output: {
        word: ctx.input.word,
        primaryPhonetic,
        phonetics: uniquePhonetics
      },
      message: `Found **${uniquePhonetics.length}** phonetic entr${uniquePhonetics.length === 1 ? 'y' : 'ies'} for "${ctx.input.word}"${primaryPhonetic ? ` (${primaryPhonetic})` : ''}${audioCount > 0 ? ` with **${audioCount}** audio file${audioCount === 1 ? '' : 's'}` : ''}.`
    };
  })
  .build();
