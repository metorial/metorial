import { SlateTool } from 'slates';
import { z } from 'zod';
import { TextToSpeechClient } from '../lib/client';
import { spec } from '../spec';

let voiceSchema = z.object({
  name: z
    .string()
    .describe(
      'Full voice name (e.g., "Microsoft Server Speech Text to Speech Voice (en-US, JennyNeural)")'
    ),
  displayName: z.string().describe('Human-readable display name of the voice'),
  localName: z.string().describe('Localized name of the voice'),
  shortName: z.string().describe('Short name used in SSML (e.g., "en-US-JennyNeural")'),
  gender: z.string().describe('Gender of the voice (Male or Female)'),
  locale: z.string().describe('Primary locale of the voice (e.g., "en-US")'),
  localeName: z
    .string()
    .describe('Human-readable locale name (e.g., "English (United States)")'),
  voiceType: z.string().describe('Type of the voice (e.g., "Neural")'),
  status: z.string().describe('Status of the voice (e.g., "GA" for General Availability)'),
  wordsPerMinute: z.string().optional().describe('Estimated words per minute for this voice'),
  styleList: z
    .array(z.string())
    .optional()
    .describe('Available speaking styles (e.g., "cheerful", "sad", "whispering")'),
  rolePlayList: z
    .array(z.string())
    .optional()
    .describe('Available role-play options (e.g., "Narrator", "Boy")'),
  secondaryLocaleList: z
    .array(z.string())
    .optional()
    .describe('Additional supported locales for multilingual voices'),
  sampleRateHertz: z.string().optional().describe('Sample rate in Hz')
});

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieves the full list of available text-to-speech voices for the configured Azure Speech region.
Use this to discover available voices, their supported languages, speaking styles, and capabilities before synthesizing speech.
Results can be filtered by locale or gender.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locale: z
        .string()
        .optional()
        .describe(
          'Filter voices by locale (e.g., "en-US", "de-DE"). Returns all voices if not specified.'
        ),
      gender: z.enum(['Male', 'Female']).optional().describe('Filter voices by gender.')
    })
  )
  .output(
    z.object({
      voices: z
        .array(voiceSchema)
        .describe('List of available voices matching the filter criteria'),
      totalCount: z.number().describe('Total number of voices returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TextToSpeechClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let allVoices = await client.listVoices();

    let filteredVoices = (allVoices as any[]).map(v => ({
      name: v.Name,
      displayName: v.DisplayName,
      localName: v.LocalName,
      shortName: v.ShortName,
      gender: v.Gender,
      locale: v.Locale,
      localeName: v.LocaleName,
      voiceType: v.VoiceType,
      status: v.Status,
      wordsPerMinute: v.WordsPerMinute,
      styleList: v.StyleList,
      rolePlayList: v.RolePlayList,
      secondaryLocaleList: v.SecondaryLocaleList,
      sampleRateHertz: v.SampleRateHertz
    }));

    if (ctx.input.locale) {
      let localeFilter = ctx.input.locale.toLowerCase();
      filteredVoices = filteredVoices.filter(v => v.locale.toLowerCase() === localeFilter);
    }

    if (ctx.input.gender) {
      filteredVoices = filteredVoices.filter(v => v.gender === ctx.input.gender);
    }

    return {
      output: {
        voices: filteredVoices,
        totalCount: filteredVoices.length
      },
      message: `Found **${filteredVoices.length}** voices${ctx.input.locale ? ` for locale "${ctx.input.locale}"` : ''}${ctx.input.gender ? ` with gender "${ctx.input.gender}"` : ''}.`
    };
  })
  .build();
