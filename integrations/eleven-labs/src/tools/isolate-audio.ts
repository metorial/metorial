import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let isolateAudio = SlateTool.create(spec, {
  name: 'Isolate Audio',
  key: 'isolate_audio',
  description: `Remove background noise from audio and isolate vocal tracks. Takes a base64-encoded audio file and returns cleaned audio with background noise, music, and ambient sounds removed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded audio file to process'),
      fileName: z.string().optional().describe('Original filename for format detection')
    })
  )
  .output(
    z.object({
      audioBase64: z.string().describe('Base64-encoded isolated audio data'),
      contentType: z.string().describe('MIME type of the output audio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.isolateAudio(ctx.input.fileBase64, ctx.input.fileName);

    return {
      output: result,
      message: `Isolated vocals from audio${ctx.input.fileName ? ` (${ctx.input.fileName})` : ''}.`
    };
  })
  .build();
