import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let generateSoundEffect = SlateTool.create(spec, {
  name: 'Generate Sound Effect',
  key: 'generate_sound_effect',
  description: `Generate audio sound effects from a text description. Configure duration, number of variations, and a creativity slider. Returns base64-encoded WAV audio for each variation. Examples: "thunderstorm rumbling", "birdsong at dawn", "keyboard typing".`,
  constraints: [
    'Prompt must be between 5 and 256 characters.',
    'Duration: 1-20 seconds.',
    'Variations: 1-4 per request.',
    'Creativity: 0 (faithful to prompt) to 1 (maximum creative deviation).',
    'Costs 50 credits per second of audio.'
  ]
})
  .input(
    z.object({
      prompt: z
        .string()
        .min(5)
        .max(256)
        .describe('Text description of the desired sound effect'),
      numVariations: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Number of variations to generate (default 3)'),
      durationSeconds: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe('Duration in seconds (default 1)'),
      creativity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Creativity level from 0 (faithful) to 1 (creative), default 0')
    })
  )
  .output(
    z.object({
      variations: z.array(
        z.object({
          inferenceId: z.string().describe('Unique inference identifier for this variation'),
          prompt: z.string().describe('The prompt used'),
          durationSeconds: z.number().describe('Duration in seconds'),
          creativity: z.number().describe('Creativity level used'),
          seed: z.number().describe('Random seed used for generation'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          wavBase64: z.string().describe('Base64-encoded WAV audio data')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let results = await client.generateSoundEffect({
      prompt: ctx.input.prompt,
      numVariations: ctx.input.numVariations,
      durationSeconds: ctx.input.durationSeconds,
      creativity: ctx.input.creativity
    });

    return {
      output: {
        variations: results.map(r => ({
          inferenceId: r.sfx_inference_history_object.inference_id,
          prompt: r.sfx_inference_history_object.sfx_prompt,
          durationSeconds: r.sfx_inference_history_object.generation_params.duration_seconds,
          creativity: r.sfx_inference_history_object.generation_params.creativity,
          seed: r.sfx_inference_history_object.generation_params.seed,
          createdAt: r.sfx_inference_history_object.created_at,
          wavBase64: r.wav_base64
        }))
      },
      message: `Generated **${results.length}** sound effect variation(s) for "${ctx.input.prompt}".`
    };
  })
  .build();
