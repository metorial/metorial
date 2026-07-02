import { SlateTool } from 'slates';
import { z } from 'zod';
import { TextToSpeechClient } from '../lib/client';
import { googleCloudSpeechActionScopes } from '../scopes';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `List available Text-to-Speech voices. Optionally filter by language code to find voices for a specific language. Returns voice names, genders, supported languages, and native sample rates.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleCloudSpeechActionScopes.listVoices)
  .input(
    z.object({
      languageCode: z
        .string()
        .optional()
        .describe(
          'BCP-47 language code to filter voices (e.g. "en-US", "de-DE"). If omitted, returns all available voices.'
        )
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceName: z
              .string()
              .optional()
              .describe('Voice identifier (e.g. "en-US-Wavenet-D").'),
            languageCodes: z
              .array(z.string())
              .optional()
              .describe('Supported BCP-47 language codes.'),
            ssmlGender: z
              .string()
              .optional()
              .describe('Voice gender (MALE, FEMALE, NEUTRAL).'),
            naturalSampleRateHertz: z
              .number()
              .optional()
              .describe('Native sample rate of the voice in Hertz.')
          })
        )
        .describe('Available voices.'),
      totalCount: z.number().describe('Total number of voices returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TextToSpeechClient({
      token: ctx.auth.token
    });

    let response = await client.listVoices(ctx.input.languageCode);
    let voices = (response.voices || []).map(v => ({
      voiceName: v.name,
      languageCodes: v.languageCodes,
      ssmlGender: v.ssmlGender,
      naturalSampleRateHertz: v.naturalSampleRateHertz
    }));

    let languageFilter = ctx.input.languageCode
      ? ` for language **${ctx.input.languageCode}**`
      : '';

    return {
      output: {
        voices,
        totalCount: voices.length
      },
      message: `Found **${voices.length}** available voice(s)${languageFilter}.`
    };
  })
  .build();
