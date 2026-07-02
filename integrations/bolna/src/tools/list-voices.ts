import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `List all available TTS voices in the Bolna account across all connected providers (ElevenLabs, Cartesia, Polly, Deepgram, etc.).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().describe('Provider-specific voice ID'),
            name: z.string().describe('Voice name'),
            provider: z.string().optional().describe('TTS provider'),
            model: z.string().optional().describe('TTS model'),
            accent: z.string().optional().describe('Voice accent/language description')
          })
        )
        .describe('Available voices'),
      totalCount: z.number().describe('Total number of voices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let voices = await client.listVoices();
    let voiceList = Array.isArray(voices) ? voices : [];

    return {
      output: {
        voices: voiceList.map((v: any) => ({
          voiceId: v.voice_id || v.id,
          name: v.name,
          provider: v.provider,
          model: v.model,
          accent: v.accent
        })),
        totalCount: voiceList.length
      },
      message: `Found **${voiceList.length}** voice(s) across all providers.`
    };
  })
  .build();
