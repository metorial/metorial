import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';
import { audioAttachment, audioOutput, audioOutputSchema } from './shared';

export let generateSoundEffect = SlateTool.create(spec, {
  name: 'Generate Sound Effect',
  key: 'generate_sound_effect',
  description: `Create sound effects from text descriptions. Describe the desired sound using natural language or audio terminology to generate cinematic sound effects, Foley, ambient sounds, and more. Returns generated audio as a Slate attachment.`,
  instructions: [
    'Be descriptive in the text prompt - include genre, mood, environment details for best results.',
    'Enable "loop" for continuous background sounds or ambient textures.'
  ],
  constraints: [
    'Duration must be between 0.5 and 30 seconds.',
    'Looping is only available with the eleven_text_to_sound_v2 model.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text description of the desired sound effect'),
      durationSeconds: z
        .number()
        .min(0.5)
        .max(30)
        .optional()
        .describe('Duration of the sound effect in seconds (0.5-30)'),
      loop: z.boolean().optional().describe('Create a seamlessly looping sound effect'),
      promptInfluence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('How closely the generation should follow the prompt (0-1)'),
      modelId: z
        .string()
        .optional()
        .describe('Sound generation model ID. Defaults to eleven_text_to_sound_v2.'),
      outputFormat: z.string().optional().describe('Audio output format, e.g. "mp3_44100_128"')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.generateSoundEffect({
      text: ctx.input.text,
      durationSeconds: ctx.input.durationSeconds,
      loop: ctx.input.loop,
      promptInfluence: ctx.input.promptInfluence,
      modelId: ctx.input.modelId,
      outputFormat: ctx.input.outputFormat
    });

    let textPreview =
      ctx.input.text.length > 80 ? `${ctx.input.text.slice(0, 80)}...` : ctx.input.text;

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Generated sound effect: "${textPreview}"${ctx.input.durationSeconds ? ` (${ctx.input.durationSeconds}s)` : ''}${ctx.input.loop ? ' (looping)' : ''}.`
    };
  })
  .build();
