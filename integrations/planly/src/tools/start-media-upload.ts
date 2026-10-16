import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString, responseData, responseRecord, teamIdSchema } from '../lib/responses';
import { spec } from '../spec';

export let startMediaUpload = SlateTool.create(spec, {
  name: 'Start Media Upload',
  key: 'start_media_upload',
  description: `Initiate a media file upload by requesting a pre-signed upload URL. After receiving the upload URL, PUT the file to that URL with the provided headers, then call "Finish Media Upload" to complete the process.
This is step 1 of 2 for direct file uploads. For importing from a URL, use "Import Media" instead. Call list_teams to discover the team ID.`,
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
      teamId: teamIdSchema,
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
      throw createApiServiceError('Either contentType or fileName must be provided');
    }

    if (!Number.isInteger(ctx.input.contentLength) || ctx.input.contentLength <= 0) {
      throw createApiServiceError('contentLength must be a positive whole number of bytes.');
    }

    let result = await client.startUpload(
      ctx.input.teamId,
      ctx.input.contentLength,
      ctx.input.contentType,
      ctx.input.fileName
    );

    let data = responseRecord(responseData(result), 'upload authorization');
    let mediaId = requiredString(data.mediaId, 'upload media ID');
    let headers =
      data.headers === undefined ? undefined : responseRecord(data.headers, 'upload headers');
    let uploadHeaders: Record<string, string> | undefined = headers ? {} : undefined;
    if (headers && uploadHeaders) {
      for (let [name, value] of Object.entries(headers)) {
        uploadHeaders[name] = requiredString(value, `upload header ${name}`);
      }
    }

    return {
      output: {
        mediaId,
        uploadUrl: requiredString(data.uploadUrl, 'upload URL'),
        verb: requiredString(data.verb, 'upload HTTP method'),
        headers: uploadHeaders
      },
      message: `Upload initiated. PUT the file to the provided URL, then call "Finish Media Upload" with mediaId: ${mediaId}.`
    };
  });
