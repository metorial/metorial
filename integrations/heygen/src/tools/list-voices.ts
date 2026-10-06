import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieve a page of available voices for text-to-speech in HeyGen. Returns voice IDs needed for video generation and TTS, along with language, gender, and preview audio. Includes both HeyGen and ElevenLabs voices.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['public', 'private']).optional().describe('Voice catalog to browse'),
      engine: z.string().optional().describe('Speech engine filter, such as starfish'),
      language: z.string().optional().describe('Language name filter, such as English'),
      gender: z.string().optional().describe('Gender filter'),
      paginationToken: z.string().optional().describe('Cursor returned by a previous page'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum items per page')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().describe('Unique voice identifier'),
            name: z.string().describe('Display name of the voice'),
            language: z.string().describe('Language of the voice'),
            gender: z.string().describe('Gender of the voice'),
            previewAudio: z.string().nullable().describe('URL to preview audio'),
            supportPause: z.boolean().describe('Whether the voice supports pause tags'),
            emotionSupport: z
              .boolean()
              .describe(
                'Legacy emotion-control flag; false when the current catalog does not publish this capability'
              ),
            availableEngines: z
              .array(z.string())
              .optional()
              .describe('Speech engines reported as available for this voice')
          })
        )
        .describe('List of available voices'),
      paginationToken: z.string().nullable(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient(ctx.auth);

    let result = await client.listVoices({ ...ctx.input, token: ctx.input.paginationToken });

    let voices = (result.voices || []).map(v => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      previewAudio: v.preview_audio_url ?? null,
      supportPause: v.support_pause,
      emotionSupport: false,
      availableEngines: v.available_engines
    }));

    return {
      output: { voices, paginationToken: result.token, hasMore: result.hasMore },
      message: `Found **${voices.length}** available voices.`
    };
  })
  .build();
