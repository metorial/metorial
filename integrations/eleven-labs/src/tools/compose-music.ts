import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let composeMusic = SlateTool.create(spec, {
  name: 'Compose Music',
  key: 'compose_music',
  description: `Generate music from a text prompt describing genre, mood, style, and optionally lyrics. Returns base64-encoded audio. This is a batch operation and may take longer for longer compositions.`,
  instructions: [
    'Describe the genre, mood, instruments, and style in the prompt for best results.',
    'Include lyrics with structure markers (e.g. [Verse], [Chorus]) to generate vocal tracks.',
    'Do not reference copyrighted material, artists, or songs by name.'
  ],
  constraints: [
    'Duration: 3 seconds to 5 minutes (3000-600000 ms).',
    'Requires a paid ElevenLabs plan.',
    'Processing time is proportional to the requested duration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      prompt: z
        .string()
        .describe(
          'Text prompt describing the desired music (genre, mood, style, optional lyrics)'
        ),
      musicLengthMs: z
        .number()
        .min(3000)
        .max(600000)
        .optional()
        .describe('Desired length of the music in milliseconds (3000-600000)'),
      outputFormat: z.string().optional().describe('Audio output format, e.g. "mp3_44100_128"')
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

    let result = await client.composeMusic({
      prompt: ctx.input.prompt,
      musicLengthMs: ctx.input.musicLengthMs,
      outputFormat: ctx.input.outputFormat
    });

    let promptPreview =
      ctx.input.prompt.length > 80 ? `${ctx.input.prompt.slice(0, 80)}...` : ctx.input.prompt;
    let durationInfo = ctx.input.musicLengthMs
      ? ` (${(ctx.input.musicLengthMs / 1000).toFixed(1)}s)`
      : '';

    return {
      output: result,
      message: `Composed music: "${promptPreview}"${durationInfo}.`
    };
  })
  .build();
