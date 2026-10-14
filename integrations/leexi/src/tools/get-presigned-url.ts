import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPresignedUrl = SlateTool.create(spec, {
  name: 'Get Presigned Recording URL',
  key: 'get_presigned_recording_url',
  description: `Request a presigned URL for uploading a call recording to Leexi. This is a prerequisite for creating a call. Upload the recording file via HTTP PUT to the returned URL, then use the S3 key when creating the call.`,
  instructions: [
    'After receiving the presigned URL, upload the file via a single PUT request using the returned uploadHeaders, including "x-amz-tagging: temporary=true".',
    'Uploaded files expire after 3 days unless used to create a call.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      extension: z
        .string()
        .describe(
          'File extension for the recording (e.g., ".mp3", ".wav", ".mp4", ".webm"; a leading dot is added when omitted)'
        )
    })
  )
  .output(
    z.object({
      presignedUrl: z.string().describe('Presigned S3 URL to upload the recording to via PUT'),
      s3Key: z.string().describe('S3 key to reference when creating the call'),
      uploadHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Headers required for the PUT upload')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.presignRecordingUrl(ctx.input.extension);
    let data = response.data || response;

    return {
      output: {
        presignedUrl: data.url || data.presigned_url,
        s3Key: data.key || data.s3_key || data.recording_s3_key,
        uploadHeaders: data.headers
      },
      message: `Presigned URL generated for **${ctx.input.extension.startsWith('.') ? ctx.input.extension : `.${ctx.input.extension}`}** recording. Upload your file via PUT to the returned URL using the required headers.`
    };
  })
  .build();
