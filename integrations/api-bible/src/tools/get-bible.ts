import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBible = SlateTool.create(spec, {
  name: 'Get Bible',
  key: 'get_bible',
  description: `Retrieve detailed metadata for a specific Bible version including name, language, copyright, and description information. Use the Bible ID from the List Bibles tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The unique ID of the Bible version to retrieve')
    })
  )
  .output(
    z.object({
      bibleId: z.string().describe('Unique identifier for the Bible version'),
      name: z.string().describe('Name of the Bible version'),
      nameLocal: z.string().describe('Localized name'),
      abbreviation: z.string().describe('Short abbreviation'),
      abbreviationLocal: z.string().describe('Localized abbreviation'),
      description: z.string().describe('Description of the Bible version'),
      descriptionLocal: z.string().describe('Localized description'),
      copyright: z.string().describe('Copyright information'),
      language: z
        .object({
          languageId: z.string().describe('Language identifier'),
          name: z.string().describe('Language name'),
          nameLocal: z.string().describe('Localized language name'),
          script: z.string().describe('Script used'),
          scriptDirection: z.string().describe('Script direction')
        })
        .describe('Language details'),
      countries: z
        .array(
          z.object({
            countryId: z.string().describe('Country identifier'),
            name: z.string().describe('Country name'),
            nameLocal: z.string().describe('Localized country name')
          })
        )
        .describe('Associated countries'),
      type: z.string().describe('Bible type'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBible(ctx.input.bibleId);
    let b = result.data;

    let output = {
      bibleId: b.bibleId,
      name: b.name || '',
      nameLocal: b.nameLocal || '',
      abbreviation: b.abbreviation || '',
      abbreviationLocal: b.abbreviationLocal || '',
      description: b.description || '',
      descriptionLocal: b.descriptionLocal || '',
      copyright: b.copyright || '',
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
    };

    return {
      output,
      message: `Retrieved Bible version: **${output.name}** (${output.abbreviation})`
    };
  })
  .build();
