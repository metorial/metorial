import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUploadUrl = SlateTool.create(spec, {
  name: 'Get Upload URL',
  key: 'get_upload_url',
  description: `Get a signed URL for uploading an audio/video file directly to Happy Scribe's storage (AWS S3). Use the returned signed URL with a PUT request to upload the file, then use the resulting S3 URL when creating a transcription order.`,
  instructions: [
    'The signed URL is temporary and should be used promptly.',
    'Upload the file using a PUT request to the signed URL with the file data as the body.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filename: z
        .string()
        .describe(
          'Name of the media file including extension (e.g. "interview.mp3", "meeting.wav").'
        )
    })
  )
  .output(
    z.object({
      signedUrl: z
        .string()
        .describe('Temporary signed URL for uploading the file via PUT request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getSignedUploadUrl(ctx.input.filename);

    return {
      output: {
        signedUrl: result.signedUrl
      },
      message: `Signed upload URL generated for **${ctx.input.filename}**. Use a PUT request to upload the file.`
    };
  })
  .build();
