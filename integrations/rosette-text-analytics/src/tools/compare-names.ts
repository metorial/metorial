import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nameSchema = z.object({
  text: z.string().describe('The name text'),
  language: z.string().optional().describe('ISO 639-3 language code of the name'),
  script: z.string().optional().describe('ISO 15924 script code (e.g., Latn, Cyrl, Arab)'),
  entityType: z
    .enum(['PERSON', 'LOCATION', 'ORGANIZATION'])
    .optional()
    .describe('Entity type of the name. Defaults to PERSON.')
});

export let compareNamesTool = SlateTool.create(spec, {
  name: 'Compare Names',
  key: 'compare_names',
  description: `Compares two names and returns a similarity score between 0 and 1. Accounts for typographical errors, phonetic spelling variations, transliteration differences, initials, nicknames, and cross-language variations. Supports PERSON, LOCATION, and ORGANIZATION entity types.`,
  instructions: [
    'Names can be in different languages and scripts for cross-language matching.',
    'Specify entityType to improve accuracy for location or organization names.'
  ],
  constraints: ['Maximum name length is 500 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name1: nameSchema.describe('The first name to compare'),
      name2: nameSchema.describe('The second name to compare')
    })
  )
  .output(
    z.object({
      score: z.number().describe('Similarity score between 0 (no match) and 1 (exact match)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.nameSimilarity(ctx.input.name1, ctx.input.name2);

    let score = result.score ?? 0;

    return {
      output: {
        score
      },
      message: `Name similarity score: **${(score * 100).toFixed(1)}%** between "${ctx.input.name1.text}" and "${ctx.input.name2.text}".`
    };
  })
  .build();
