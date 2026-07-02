import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let generateSoundEffectTool = SlateTool.create(spec, {
  name: 'Generate Sound Effect',
  key: 'generate_sound_effect',
  description: `Generate sound effects from text descriptions. Returns base64-encoded audio. Useful for creating cinematic sound effects for videos, voice-overs, or games.`,
  constraints: [
    'Duration must be between 0.5 and 30 seconds.',
    'Looping is only available with the eleven_text_to_sound_v2 model.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .describe(
          'Text description of the desired sound effect (e.g. "thunder rumbling in the distance", "cat purring softly")'
        ),
      durationSeconds: z
        .number()
        .min(0.5)
        .max(30)
        .optional()
        .describe(
          'Duration of the sound effect in seconds (0.5-30). Auto-determined if omitted'
        ),
      promptInfluence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'How closely to follow the prompt (0-1). Higher values are more literal. Defaults to 0.3'
        ),
      loop: z.boolean().optional().describe('Create a seamlessly looping sound effect'),
      outputFormat: z
        .string()
        .optional()
        .describe('Output audio format (e.g. "mp3_44100_128"). Defaults to "mp3_44100_128"')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio data'),
      contentType: z.string().describe('MIME type of the audio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.generateSoundEffect({
      text: ctx.input.text,
      durationSeconds: ctx.input.durationSeconds,
      promptInfluence: ctx.input.promptInfluence,
      loop: ctx.input.loop,
      outputFormat: ctx.input.outputFormat
    });

    return {
      output: result,
      message: `Generated sound effect: "${ctx.input.text}"${ctx.input.durationSeconds ? ` (${ctx.input.durationSeconds}s)` : ''}${ctx.input.loop ? ' (looping)' : ''}.`
    };
  })
  .build();
