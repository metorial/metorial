import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Retrieve all available voices for text-to-speech and avatar video generation. Returns voice IDs, names, descriptions, and sample audio URLs. Use a voice ID from this list when generating speech or creating avatar videos.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      voices: z.array(
        z.object({
          voiceId: z.string().describe('Unique voice identifier'),
          voiceName: z.string().nullable().describe('Display name of the voice'),
          voiceDescription: z
            .string()
            .nullable()
            .describe('Description of the voice characteristics'),
          voiceSample: z.string().nullable().describe('URL to a sample audio clip')
        })
      ),
      totalVoices: z.number().describe('Total number of available voices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.listVoices();

    let voices = result.data.map(v => ({
      voiceId: v.voice_id,
      voiceName: v.voice_name,
      voiceDescription: v.voice_description,
      voiceSample: v.voice_sample
    }));

    return {
      output: {
        voices,
        totalVoices: result.total_voices
      },
      message: `Found **${result.total_voices}** available voices.`
    };
  })
  .build();
