import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startMediaUpload = SlateTool.create(spec, {
  name: 'Start Media Upload',
  key: 'start_media_upload',
  description: `Initiate a media file upload by requesting a pre-signed upload URL. After receiving the upload URL, PUT the file to that URL with the provided headers, then call "Finish Media Upload" to complete the process.
This is step 1 of 2 for direct file uploads. For importing from a URL, use "Import Media" instead.`,
  instructions: [
    'After receiving the uploadUrl, PUT the file content to that URL using the provided headers.',
    'Then call "Finish Media Upload" with the returned mediaId to complete the upload.',
    'Provide either contentType or fileName (at least one is required).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to upload media for'),
      contentLength: z.number().describe('File size in bytes'),
      contentType: z
        .string()
        .optional()
        .describe(
          'MIME type (e.g., image/png, video/mp4). Required if fileName is not provided'
        ),
      fileName: z
        .string()
        .optional()
        .describe('Original file name. Required if contentType is not provided')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Media ID to use when finishing the upload'),
      uploadUrl: z.string().describe('Pre-signed URL to PUT the file to'),
      verb: z.string().describe('HTTP method to use for uploading (PUT)'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Headers to include when uploading the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.contentType && !ctx.input.fileName) {
      throw new Error('Either contentType or fileName must be provided');
    }

    let result = await client.startUpload(
      ctx.input.teamId,
      ctx.input.contentLength,
      ctx.input.contentType,
      ctx.input.fileName
    );

    return {
      output: {
        mediaId: result.mediaId,
        uploadUrl: result.uploadUrl,
        verb: result.verb || 'PUT',
        headers: result.headers
      },
      message: `Upload initiated. PUT the file to the provided URL, then call "Finish Media Upload" with mediaId: ${result.mediaId}.`
    };
  });
