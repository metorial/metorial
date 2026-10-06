import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';
import { mediaDownload } from './get-file-url';

export let uploadMediaTool = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Create a pre-signed upload URL for media files or check the status of a previously initiated upload.
Use **create** to get an upload URL for a file, then upload the file directly to the returned S3 URL.
Use **status** to check processing, or set download to retrieve a downloadable copy of READY media.`,
  instructions: [
    'PUT exactly sizeBytes bytes to the returned upload URL with the declared Content-Type. Do not send a Hootsuite bearer token to the storage host.',
    'The upload URL is a sensitive, temporary upload authorization. Only the first valid upload is used.',
    'Poll status until READY before using the media ID in a message. Download is available only after processing.',
    'The API has no documented media deletion. Hootsuite removes media 90 days after its use in a message; do not assume unused media can be immediately cleaned up.'
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
        .describe('Media ID to check status for (required for status)'),
      download: z
        .boolean()
        .optional()
        .describe('Return a downloadable copy of READY media; only valid with status')
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
        .describe('Provider processing state (currently READY or QUEUED)'),
      mimeType: z.string().optional().describe('MIME type of the uploaded file'),
      thumbnailUrl: z
        .string()
        .optional()
        .describe('Legacy thumbnail permalink when available'),
      downloaded: z.boolean().optional().describe('Whether a downloadable copy was supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (ctx.input.download)
        throw createApiServiceError('download is only available for the status action.');
      if (!ctx.input.sizeBytes || !ctx.input.mimeType) {
        throw createApiServiceError('sizeBytes and mimeType are required for create action.');
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
      throw createApiServiceError('mediaId is required for status action.');
    }

    let requestedAt = Date.now();
    let status = await client.getMediaUploadStatus(ctx.input.mediaId);
    let thumbnailUrl: string | undefined;
    if (status.thumbnailUrl) {
      try {
        let preview = new URL(status.thumbnailUrl);
        if (
          preview.protocol === 'https:' &&
          !preview.username &&
          !preview.password &&
          !preview.search &&
          !preview.hash
        )
          thumbnailUrl = preview.toString();
      } catch {
        // An optional legacy preview must not invalidate the media status receipt.
      }
    }
    if (ctx.input.download) {
      let file = mediaDownload(status, requestedAt);
      await ctx.addAttachment({
        type: 'url',
        url: file.url,
        mimeType: status.mimeType,
        refreshReference: { mediaId: status.id },
        refreshAt: file.expiresAt
      });
    }

    return {
      output: {
        mediaId: String(status.id),
        uploadUrl: undefined,
        uploadUrlDurationSeconds: undefined,
        state: status.state,
        mimeType: status.mimeType,
        thumbnailUrl,
        downloaded: ctx.input.download ?? false
      },
      message: `Media **${status.id}** is in state **${status.state}**.${ctx.input.download ? ' A downloadable copy is available.' : ''}`
    };
  })
  .build();
