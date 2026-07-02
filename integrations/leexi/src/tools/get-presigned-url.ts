import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPresignedUrl = SlateTool.create(spec, {
  name: 'Get Presigned Recording URL',
  key: 'get_presigned_recording_url',
  description: `Request a presigned URL for uploading a call recording to Leexi. This is a prerequisite for creating a call. Upload the recording file via HTTP PUT to the returned URL, then use the S3 key when creating the call.`,
  instructions: [
    'After receiving the presigned URL, upload the file via PUT request to that URL with the header "x-amz-tagging: temporary=true".',
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
        .describe('File extension for the recording (e.g., "mp3", "wav", "mp4", "webm")')
    })
  )
  .output(
    z.object({
      presignedUrl: z.string().describe('Presigned S3 URL to upload the recording to via PUT'),
      s3Key: z.string().describe('S3 key to reference when creating the call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.presignRecordingUrl(ctx.input.extension);

    return {
      output: {
        presignedUrl: response.url || response.presigned_url,
        s3Key: response.key || response.s3_key || response.recording_s3_key
      },
      message: `Presigned URL generated for **.${ctx.input.extension}** recording. Upload your file via PUT to the returned URL.`
    };
  })
  .build();
