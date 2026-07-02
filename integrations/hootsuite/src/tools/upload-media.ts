import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let uploadMediaTool = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Create a pre-signed upload URL for media files or check the status of a previously initiated upload.
Use **create** to get an upload URL for a file, then upload the file directly to the returned S3 URL.
Use **status** to check whether media processing is complete before attaching to a message.`,
  instructions: [
    'After creating an upload URL, PUT the file to the returned URL with the correct Content-Type.',
    'Poll the status endpoint until the state is READY before using the media ID in a message.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'status'])
        .describe('Whether to create an upload URL or check upload status'),
      sizeBytes: z.number().optional().describe('File size in bytes (required for create)'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type of the file (required for create, e.g. image/jpeg, video/mp4)'),
      mediaId: z
        .string()
        .optional()
        .describe('Media ID to check status for (required for status)')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Media ID'),
      uploadUrl: z
        .string()
        .optional()
        .describe('Pre-signed S3 upload URL (only for create action)'),
      uploadUrlDurationSeconds: z
        .number()
        .optional()
        .describe('How long the upload URL is valid'),
      state: z
        .string()
        .optional()
        .describe('Upload processing state (e.g. READY, PROCESSING, FAILED)'),
      mimeType: z.string().optional().describe('MIME type of the uploaded file'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (!ctx.input.sizeBytes || !ctx.input.mimeType) {
        throw new Error('sizeBytes and mimeType are required for create action');
      }

      let result = await client.createMediaUploadUrl(ctx.input.sizeBytes, ctx.input.mimeType);

      return {
        output: {
          mediaId: result.mediaId,
          uploadUrl: result.uploadUrl,
          uploadUrlDurationSeconds: result.uploadUrlDurationSeconds,
          state: undefined,
          mimeType: ctx.input.mimeType,
          thumbnailUrl: undefined
        },
        message: `Created upload URL for **${ctx.input.mimeType}** file. Upload URL expires in **${result.uploadUrlDurationSeconds}s**. Media ID: **${result.mediaId}**.`
      };
    }

    if (!ctx.input.mediaId) {
      throw new Error('mediaId is required for status action');
    }

    let status = await client.getMediaUploadStatus(ctx.input.mediaId);

    return {
      output: {
        mediaId: String(status.id),
        uploadUrl: undefined,
        uploadUrlDurationSeconds: undefined,
        state: status.state,
        mimeType: status.mimeType,
        thumbnailUrl: status.thumbnailUrl
      },
      message: `Media **${status.id}** is in state **${status.state}**.`
    };
  })
  .build();
