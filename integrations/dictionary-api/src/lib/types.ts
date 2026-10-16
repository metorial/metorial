import { z } from 'zod';

export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name: string;
    url: string;
  };
}

export interface DictionaryDefinition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  origin?: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license?: {
    name: string;
    url: string;
  };
  sourceUrls?: string[];
  [key: string]: unknown;
}

let nonblankString = z.string().refine(value => value.trim().length > 0);

// The official v2 example omits meaning-level synonyms/antonyms and sourceUrls.
// Preserve those omissions in the raw response; tools retain their existing array outputs.
export let dictionaryEntriesSchema = z.array(
  z.looseObject({
    word: nonblankString,
    phonetic: z.string().optional(),
    origin: z.string().optional(),
    phonetics: z.array(
      z.looseObject({
        text: z.string().optional(),
        audio: z.string().optional(),
        sourceUrl: z.string().optional()
      })
    ),
    meanings: z.array(
      z.looseObject({
        partOfSpeech: nonblankString,
        definitions: z.array(
          z.looseObject({
            definition: nonblankString,
            example: z.string().optional(),
            synonyms: z.array(z.string()),
            antonyms: z.array(z.string())
          })
        ),
        synonyms: z.array(z.string()).optional(),
        antonyms: z.array(z.string()).optional()
      })
    ),
    sourceUrls: z.array(z.string()).optional()
  })
);
