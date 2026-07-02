import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupWord = SlateTool.create(spec, {
  name: 'Lookup Word',
  key: 'lookup_word',
  description: `Look up a word's definition, synonyms, and antonyms. Combines dictionary and thesaurus data in a single lookup for comprehensive word information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      word: z.string().describe('The English word to look up')
    })
  )
  .output(
    z.object({
      word: z.string().describe('The queried word'),
      valid: z.boolean().describe('Whether the word is valid'),
      definition: z.string().optional().describe('Definition of the word'),
      synonyms: z.array(z.string()).describe('List of synonyms'),
      antonyms: z.array(z.string()).describe('List of antonyms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [dictResult, thesResult] = await Promise.all([
      client.getDictionary(ctx.input.word),
      client.getThesaurus(ctx.input.word)
    ]);

    let synonyms = thesResult.synonyms ?? [];
    let antonyms = thesResult.antonyms ?? [];

    return {
      output: {
        word: dictResult.word ?? ctx.input.word,
        valid: dictResult.valid ?? false,
        definition: dictResult.definition,
        synonyms,
        antonyms
      },
      message: dictResult.valid
        ? `**${ctx.input.word}**: ${dictResult.definition?.substring(0, 200) ?? 'No definition available'}${synonyms.length > 0 ? `\n\nSynonyms: ${synonyms.slice(0, 5).join(', ')}` : ''}`
        : `**${ctx.input.word}** was not found in the dictionary.`
    };
  })
  .build();
