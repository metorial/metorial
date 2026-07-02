import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let isolateAudioTool = SlateTool.create(spec, {
  name: 'Isolate Audio',
  key: 'isolate_audio',
  description: `Separate vocal tracks from background noise in an audio file. Accepts base64-encoded audio and returns the isolated vocals as base64-encoded audio.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      audioBase64: z.string().describe('Base64-encoded audio file to process'),
      fileName: z
        .string()
        .optional()
        .describe('Original file name of the audio (e.g. "recording.mp3")')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded isolated audio (vocals only)'),
      contentType: z.string().describe('MIME type of the output audio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.isolateAudio({
      audioBase64: ctx.input.audioBase64,
      fileName: ctx.input.fileName
    });

    return {
      output: result,
      message: `Isolated vocals from audio${ctx.input.fileName ? ` (${ctx.input.fileName})` : ''}. Background noise removed.`
    };
  })
  .build();
