import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Browse available voices for Retell AI agents. Returns all voices with their provider, gender, accent, and preview audio. Use to find the right voice ID when creating or updating agents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filterProvider: z
        .enum([
          'elevenlabs',
          'openai',
          'deepgram',
          'cartesia',
          'minimax',
          'fish_audio',
          'platform'
        ])
        .optional()
        .describe('Filter voices by provider'),
      filterGender: z.enum(['male', 'female']).optional().describe('Filter voices by gender')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().describe('Unique voice identifier'),
            voiceName: z.string().describe('Human-readable voice name'),
            provider: z.string().describe('Voice provider'),
            gender: z.string().describe('Voice gender'),
            accent: z.string().optional().describe('Voice accent'),
            age: z.string().optional().describe('Voice age'),
            previewAudioUrl: z.string().optional().describe('URL to preview audio sample')
          })
        )
        .describe('List of available voices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let voices = await client.listVoices();

    let mapped = (voices as any[]).map((v: any) => ({
      voiceId: v.voice_id,
      voiceName: v.voice_name,
      provider: v.provider,
      gender: v.gender,
      accent: v.accent,
      age: v.age,
      previewAudioUrl: v.preview_audio_url
    }));

    // Apply client-side filtering
    if (ctx.input.filterProvider) {
      mapped = mapped.filter(v => v.provider === ctx.input.filterProvider);
    }
    if (ctx.input.filterGender) {
      mapped = mapped.filter(v => v.gender === ctx.input.filterGender);
    }

    return {
      output: { voices: mapped },
      message: `Found **${mapped.length}** voice(s).`
    };
  })
  .build();
