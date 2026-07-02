import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieve the catalog of available text-to-speech voices. Optionally filter by language code to narrow results. Returns voice IDs, display names, and language codes that can be used with the Generate Audio tool.`,
  constraints: [
    'Rate limit: 20 calls per day for the voices endpoint. Cache results locally when possible.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      languageCode: z
        .string()
        .optional()
        .describe('Optional language code to filter voices (e.g., "en-US", "fr-FR", "de-DE").')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z
              .string()
              .describe('Unique voice identifier to use in audio generation.'),
            name: z.string().describe('Human-readable name of the voice.'),
            language: z.string().describe('Language code of the voice (e.g., "en-US").')
          })
        )
        .describe('List of available voices.'),
      totalCount: z.number().describe('Total number of voices returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching available voices...');

    let voices = await client.getVoices(ctx.input.languageCode);

    let filterNote = ctx.input.languageCode
      ? ` for language **${ctx.input.languageCode}**`
      : '';

    return {
      output: {
        voices,
        totalCount: voices.length
      },
      message: `Found **${voices.length}** voice${voices.length !== 1 ? 's' : ''}${filterNote}.`
    };
  })
  .build();
