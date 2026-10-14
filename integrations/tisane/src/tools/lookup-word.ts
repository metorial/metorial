import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupWord = SlateTool.create(spec, {
  name: 'Lookup Word',
  key: 'lookup_word',
  description: `Looks up a word in Tisane's language models to retrieve its senses (meanings), definitions, and crosslingual family IDs. Can also retrieve inflected forms, hypernyms (broader terms), and hyponyms (narrower terms) for a given family.
Useful for linguistic research, understanding word senses, and exploring semantic relationships.`,
  instructions: [
    'Start by looking up senses for a word to get family IDs, then use those family IDs to explore inflections, hypernyms, or hyponyms.',
    'The word can be in any inflected form, not just the base/lemma form.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language: z.string().describe('ISO 639-1 language code (e.g., "en")'),
      word: z
        .string()
        .optional()
        .describe('The word to look up (can be inflected). Required for sense lookup.'),
      familyId: z
        .number()
        .optional()
        .describe('Family ID to inspect for details, hypernyms, hyponyms, or inflections'),
      lexemeId: z.number().optional().describe('Lexeme ID for retrieving inflected forms'),
      includeHypernyms: z
        .boolean()
        .optional()
        .describe('Include hypernyms (broader terms) for the given family ID'),
      includeHyponyms: z
        .boolean()
        .optional()
        .describe('Include hyponyms (narrower terms) for the given family ID'),
      includeInflections: z
        .boolean()
        .optional()
        .describe('Include inflected forms. Requires both familyId and lexemeId.'),
      maxHypernymLevel: z
        .number()
        .optional()
        .describe('Maximum levels to traverse upward when fetching hypernyms')
    })
  )
  .output(
    z.object({
      senses: z
        .array(z.any())
        .optional()
        .describe('Word senses with family IDs and definitions'),
      familyDetails: z
        .any()
        .optional()
        .describe('Detailed information about a concept family'),
      hypernyms: z.any().optional().describe('Broader/parent terms in the concept hierarchy'),
      hyponyms: z.any().optional().describe('Narrower/child terms in the concept hierarchy'),
      inflections: z
        .array(z.any())
        .optional()
        .describe('Inflected forms of the word with grammatical features')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.language.trim()) {
      throw createApiServiceError('Provide a language code for the word lookup.');
    }
    if (ctx.input.word !== undefined && !ctx.input.word.trim()) {
      throw createApiServiceError('Provide a non-empty word to look up.');
    }
    for (let [name, value] of [
      ['familyId', ctx.input.familyId],
      ['lexemeId', ctx.input.lexemeId]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
        throw createApiServiceError(`${name} must be a positive integer.`);
      }
    }
    if (
      ctx.input.maxHypernymLevel !== undefined &&
      (!Number.isSafeInteger(ctx.input.maxHypernymLevel) || ctx.input.maxHypernymLevel < 0)
    ) {
      throw createApiServiceError('maxHypernymLevel must be a non-negative integer.');
    }
    if (
      (ctx.input.includeHypernyms || ctx.input.includeHyponyms) &&
      ctx.input.familyId === undefined
    ) {
      throw createApiServiceError('Provide familyId to retrieve hypernyms or hyponyms.');
    }
    if (
      ctx.input.includeInflections &&
      (ctx.input.familyId === undefined || ctx.input.lexemeId === undefined)
    ) {
      throw createApiServiceError(
        'Provide both familyId and lexemeId to retrieve inflected forms. Use analyze_text with words enabled to discover these IDs.'
      );
    }
    if (ctx.input.maxHypernymLevel !== undefined && !ctx.input.includeHypernyms) {
      throw createApiServiceError('Enable includeHypernyms when setting maxHypernymLevel.');
    }
    if (
      ctx.input.word === undefined &&
      ctx.input.familyId === undefined &&
      !ctx.input.includeInflections
    ) {
      throw createApiServiceError('Provide word or familyId, or request inflected forms.');
    }
    let client = new Client(ctx.auth.token);
    let output: Record<string, any> = {};
    let parts: string[] = [];

    if (ctx.input.word) {
      let senses = await client.lookupSenses(ctx.input.language, ctx.input.word);
      output.senses = senses;
      parts.push(`Found **${senses.length} sense(s)** for "${ctx.input.word}".`);
    }

    if (ctx.input.familyId !== undefined) {
      let familyDetails = await client.getFamily(ctx.input.familyId);
      output.familyDetails = familyDetails;
      parts.push(`Retrieved family details for ID **${ctx.input.familyId}**.`);

      if (ctx.input.includeHypernyms) {
        let hypernyms = await client.getHypernyms(
          ctx.input.familyId,
          ctx.input.maxHypernymLevel
        );
        output.hypernyms = hypernyms;
        parts.push(`Retrieved hypernyms.`);
      }

      if (ctx.input.includeHyponyms) {
        let hyponyms = await client.getHyponyms(ctx.input.familyId);
        output.hyponyms = hyponyms;
        parts.push(`Retrieved hyponyms.`);
      }
    }

    if (ctx.input.includeInflections) {
      let inflections = await client.getInflections(
        ctx.input.language,
        ctx.input.lexemeId,
        ctx.input.familyId
      );
      output.inflections = inflections;
      parts.push(`Retrieved **${inflections.length} inflection(s)**.`);
    }

    return {
      output,
      message: parts.join('\n')
    };
  })
  .build();
