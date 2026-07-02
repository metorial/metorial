import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let audioBibleSchema = z.object({
  audioBibleId: z.string().describe('Unique identifier for the audio Bible version'),
  name: z.string().describe('Name of the audio Bible'),
  nameLocal: z.string().describe('Localized name'),
  description: z.string().describe('Description of the audio Bible'),
  descriptionLocal: z.string().describe('Localized description'),
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
  type: z.string().describe('Audio Bible type'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listAudioBibles = SlateTool.create(spec, {
  name: 'List Audio Bibles',
  key: 'list_audio_bibles',
  description: `Browse available audio Bible versions. Returns metadata about each audio version including name, language, and countries. Can be filtered by language.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code to filter by (e.g., "eng" for English)')
    })
  )
  .output(
    z.object({
      audioBibles: z.array(audioBibleSchema).describe('List of audio Bible versions'),
      totalCount: z.number().describe('Number of audio Bibles returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAudioBibles({
      language: ctx.input.language
    });

    let audioBibles = (result.data || []).map(ab => ({
      audioBibleId: ab.audioBibleId,
      name: ab.name || '',
      nameLocal: ab.nameLocal || '',
      description: ab.description || '',
      descriptionLocal: ab.descriptionLocal || '',
      language: {
        languageId: ab.language?.id || '',
        name: ab.language?.name || '',
        nameLocal: ab.language?.nameLocal || '',
        script: ab.language?.script || '',
        scriptDirection: ab.language?.scriptDirection || ''
      },
      countries: (ab.countries || []).map(c => ({
        countryId: c.id,
        name: c.name,
        nameLocal: c.nameLocal
      })),
      type: ab.type || '',
      updatedAt: ab.updatedAt || ''
    }));

    return {
      output: {
        audioBibles,
        totalCount: audioBibles.length
      },
      message: `Found **${audioBibles.length}** audio Bible version(s)${ctx.input.language ? ` for language "${ctx.input.language}"` : ''}.`
    };
  })
  .build();
