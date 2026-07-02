import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let getSfxHistory = SlateTool.create(spec, {
  name: 'Get Sound Effects History',
  key: 'get_sfx_history',
  description: `Retrieve the history of previously generated sound effects, or fetch audio for a specific sound effect by inference ID. History entries include prompt, generation parameters, and timestamps. Use the inference ID to retrieve the actual audio data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inferenceId: z
        .string()
        .optional()
        .describe('If provided, retrieves audio data for this specific sound effect'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return (default 10)')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of SFX history entries'),
      entries: z.array(
        z.object({
          inferenceId: z.string().describe('Unique inference identifier'),
          prompt: z.string().describe('Text prompt used for generation'),
          durationSeconds: z.number().describe('Duration in seconds'),
          creativity: z.number().describe('Creativity level used'),
          seed: z.number().describe('Random seed used'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          wavBase64: z
            .string()
            .optional()
            .describe('Base64-encoded WAV audio (only when fetching by inferenceId)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.inferenceId) {
      let result = await client.getSfxAudio(ctx.input.inferenceId);
      return {
        output: {
          total: 1,
          entries: [
            {
              inferenceId: result.sfx_inference_history_object.inference_id,
              prompt: result.sfx_inference_history_object.sfx_prompt,
              durationSeconds:
                result.sfx_inference_history_object.generation_params.duration_seconds,
              creativity: result.sfx_inference_history_object.generation_params.creativity,
              seed: result.sfx_inference_history_object.generation_params.seed,
              createdAt: result.sfx_inference_history_object.created_at,
              wavBase64: result.wav_base64
            }
          ]
        },
        message: `Retrieved audio for sound effect inference **${ctx.input.inferenceId}**.`
      };
    }

    let result = await client.getSfxHistory({
      skip: ctx.input.skip,
      limit: ctx.input.limit
    });

    return {
      output: {
        total: result.total,
        entries: result.data.map(e => ({
          inferenceId: e.inference_id,
          prompt: e.sfx_prompt,
          durationSeconds: e.generation_params.duration_seconds,
          creativity: e.generation_params.creativity,
          seed: e.generation_params.seed,
          createdAt: e.created_at
        }))
      },
      message: `Retrieved **${result.data.length}** of **${result.total}** sound effect history entries.`
    };
  })
  .build();
