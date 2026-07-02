import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';
import { audioAttachment, audioOutput, audioOutputSchema } from './shared';

export let isolateAudio = SlateTool.create(spec, {
  name: 'Isolate Audio',
  key: 'isolate_audio',
  description: `Remove background noise from audio and isolate vocal tracks. Takes a base64-encoded audio file and returns cleaned audio as a Slate attachment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded audio file to process'),
      fileName: z.string().optional().describe('Original filename for format detection'),
      fileFormat: z
        .enum(['pcm_s16le_16', 'other'])
        .optional()
        .describe('Input format. Use pcm_s16le_16 for raw 16-bit 16kHz mono PCM.'),
      previewBase64: z
        .string()
        .optional()
        .describe('Optional preview image base64 for tracking this generation')
    })
  )
  .output(audioOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.isolateAudio({
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName,
      fileFormat: ctx.input.fileFormat,
      previewBase64: ctx.input.previewBase64
    });

    return {
      output: audioOutput(result),
      attachments: [audioAttachment(result)],
      message: `Isolated vocals from audio${ctx.input.fileName ? ` (${ctx.input.fileName})` : ''}.`
    };
  })
  .build();
