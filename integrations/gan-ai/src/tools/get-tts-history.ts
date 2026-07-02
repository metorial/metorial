import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let getTtsHistory = SlateTool.create(spec, {
  name: 'Get TTS History',
  key: 'get_tts_history',
  description: `Retrieve the history of previously generated text-to-speech audio. Returns inference IDs, input text, voice names, timestamps, and audio file URLs. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of records to return (default 10)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of TTS history entries'),
      entries: z.array(
        z.object({
          inferenceId: z.string().describe('Unique inference identifier'),
          inputText: z.string().describe('Text that was synthesized'),
          voiceName: z.string().nullable().describe('Name of the voice used'),
          createdAt: z.string().nullable().describe('ISO 8601 creation timestamp'),
          audioFileUrl: z.string().nullable().describe('URL to the generated audio file')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);
    let result = await client.getTtsHistory({
      skip: ctx.input.skip,
      limit: ctx.input.limit
    });

    return {
      output: {
        total: result.total,
        entries: result.data.map(e => ({
          inferenceId: e.inference_id,
          inputText: e.tts_input_text,
          voiceName: e.voice_name,
          createdAt: e.created_at,
          audioFileUrl: e.audio_file
        }))
      },
      message: `Retrieved **${result.data.length}** of **${result.total}** TTS history entries.`
    };
  })
  .build();
