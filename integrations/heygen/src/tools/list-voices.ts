import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieve all available voices for text-to-speech in HeyGen. Returns voice IDs needed for video generation and TTS, along with language, gender, and preview audio. Includes both HeyGen and ElevenLabs voices.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().describe('Unique voice identifier'),
            name: z.string().describe('Display name of the voice'),
            language: z.string().describe('Language of the voice'),
            gender: z.string().describe('Gender of the voice'),
            previewAudio: z.string().describe('URL to preview audio'),
            supportPause: z.boolean().describe('Whether the voice supports pause tags'),
            emotionSupport: z.boolean().describe('Whether the voice supports emotion control')
          })
        )
        .describe('List of available voices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listVoices();

    let voices = (result.voices || []).map(v => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      previewAudio: v.preview_audio,
      supportPause: v.support_pause,
      emotionSupport: v.emotion_support
    }));

    return {
      output: { voices },
      message: `Found **${voices.length}** available voices.`
    };
  })
  .build();
