import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let languageSchema = z.object({
  languageId: z.string().describe('Language identifier'),
  name: z.string().describe('Language name'),
  nameLocal: z.string().describe('Localized language name'),
  script: z.string().describe('Script used for the language'),
  scriptDirection: z.string().describe('Script direction (e.g., LTR, RTL)')
});

let countrySchema = z.object({
  countryId: z.string().describe('Country identifier'),
  name: z.string().describe('Country name'),
  nameLocal: z.string().describe('Localized country name')
});

let bibleSchema = z.object({
  bibleId: z.string().describe('Unique identifier for the Bible version'),
  name: z.string().describe('Name of the Bible version'),
  nameLocal: z.string().describe('Localized name of the Bible version'),
  abbreviation: z.string().describe('Short abbreviation (e.g., KJV, NIV)'),
  abbreviationLocal: z.string().describe('Localized abbreviation'),
  description: z.string().describe('Description of the Bible version'),
  descriptionLocal: z.string().describe('Localized description'),
  language: languageSchema.describe('Language of the Bible version'),
  countries: z.array(countrySchema).describe('Countries associated with this version'),
  type: z.string().describe('Bible type (e.g., text)'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listBibles = SlateTool.create(spec, {
  name: 'List Bibles',
  key: 'list_bibles',
  description: `Browse available Bible versions (translations/editions). Returns metadata about each version including name, abbreviation, language, and countries. Can be filtered by language or searched by name/abbreviation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe(
          'ISO 639-3 language code to filter Bibles by language (e.g., "eng" for English)'
        ),
      abbreviation: z
        .string()
        .optional()
        .describe('Filter by Bible abbreviation (e.g., "KJV")'),
      name: z.string().optional().describe('Search Bibles by name'),
      ids: z
        .string()
        .optional()
        .describe('Comma-separated list of Bible IDs to retrieve specific versions')
    })
  )
  .output(
    z.object({
      bibles: z.array(bibleSchema).describe('List of matching Bible versions'),
      totalCount: z.number().describe('Total number of Bible versions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBibles({
      language: ctx.input.language,
      abbreviation: ctx.input.abbreviation,
      name: ctx.input.name,
      ids: ctx.input.ids
    });

    let bibles = (result.data || []).map(b => ({
      bibleId: b.bibleId,
      name: b.name || '',
      nameLocal: b.nameLocal || '',
      abbreviation: b.abbreviation || '',
      abbreviationLocal: b.abbreviationLocal || '',
      description: b.description || '',
      descriptionLocal: b.descriptionLocal || '',
      language: {
        languageId: b.language?.id || '',
        name: b.language?.name || '',
        nameLocal: b.language?.nameLocal || '',
        script: b.language?.script || '',
        scriptDirection: b.language?.scriptDirection || ''
      },
      countries: (b.countries || []).map(c => ({
        countryId: c.id,
        name: c.name,
        nameLocal: c.nameLocal
      })),
      type: b.type || '',
      updatedAt: b.updatedAt || ''
    }));

    return {
      output: {
        bibles,
        totalCount: bibles.length
      },
      message: `Found **${bibles.length}** Bible version(s)${ctx.input.language ? ` for language "${ctx.input.language}"` : ''}${ctx.input.name ? ` matching "${ctx.input.name}"` : ''}.`
    };
  })
  .build();
