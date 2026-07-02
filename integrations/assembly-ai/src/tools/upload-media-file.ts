import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assemblyAiServiceError } from '../lib/errors';
import { spec } from '../spec';

let decodeBase64 = (value: string) => {
  let normalized = value.trim().replace(/\s/g, '');
  let buffer = Buffer.from(normalized, 'base64');

  if (buffer.length === 0) {
    throw assemblyAiServiceError('contentBase64 must contain at least one byte.');
  }

  let canonical = buffer.toString('base64').replace(/=+$/, '');
  let provided = normalized.replace(/=+$/, '');
  if (canonical !== provided) {
    throw assemblyAiServiceError('contentBase64 must be valid base64-encoded media.');
  }

  return buffer;
};

export let uploadMediaFile = SlateTool.create(spec, {
  name: 'Upload Media File',
  key: 'upload_media_file',
  description: `Upload local audio or video bytes to AssemblyAI and receive an AssemblyAI-only upload URL. Use the returned uploadUrl as audioUrl in Submit Transcription when the media is not already publicly accessible.`,
  instructions: [
    'The upload URL is only accessible to AssemblyAI servers.',
    'Submit the returned uploadUrl with Submit Transcription to process the media.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contentBase64: z
        .string()
        .describe('Base64-encoded audio or video file content to upload.'),
      filename: z
        .string()
        .optional()
        .describe('Original filename for user-facing metadata only.'),
      mimeType: z
        .string()
        .optional()
        .describe('Original MIME type for user-facing metadata only.')
    })
  )
  .output(
    z.object({
      uploadUrl: z
        .string()
        .describe('AssemblyAI upload URL to pass as audioUrl to Submit Transcription.'),
      filename: z.string().optional().describe('Original filename if provided.'),
      mimeType: z.string().optional().describe('Original MIME type if provided.'),
      byteLength: z.number().describe('Decoded upload size in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let content = decodeBase64(ctx.input.contentBase64);
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.uploadMediaFile(ctx.input.contentBase64);

    return {
      output: {
        uploadUrl: result.upload_url,
        filename: ctx.input.filename,
        mimeType: ctx.input.mimeType,
        byteLength: content.byteLength
      },
      message: `Uploaded media file${ctx.input.filename ? ` **${ctx.input.filename}**` : ''} to AssemblyAI (${content.byteLength} bytes). Use the upload URL with Submit Transcription.`
    };
  })
  .build();
