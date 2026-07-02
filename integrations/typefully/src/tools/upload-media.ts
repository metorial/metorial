import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Initiate a media upload to Typefully. Returns a presigned upload URL and media ID. After uploading the file to the presigned URL via PUT, use the media ID when creating or updating drafts. You can also check the processing status of previously uploaded media.`,
  instructions: [
    'Set action to "initiate" to start a new upload, or "check-status" to check an existing upload.',
    'After initiating, upload the file to the returned uploadUrl via a PUT request with raw file bytes.',
    'Wait for the media status to become "ready" before attaching it to a draft.'
  ],
  constraints: [
    'Supported formats vary by platform. Images: JPG, PNG, WEBP, GIF. Videos: MP4, MOV. Also supports PDF for LinkedIn.',
    'File size limits depend on the platform and plan (free vs paid).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set'),
      action: z
        .enum(['initiate', 'check-status'])
        .describe('Action: "initiate" a new upload or "check-status" of an existing one'),
      fileName: z
        .string()
        .optional()
        .describe('File name with extension (required for "initiate")'),
      mediaId: z
        .string()
        .optional()
        .describe('Media ID to check status for (required for "check-status")')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the media'),
      uploadUrl: z
        .string()
        .nullable()
        .describe('Presigned URL for uploading the file (only for "initiate")'),
      status: z
        .string()
        .nullable()
        .describe(
          'Processing status: "processing", "ready", or "failed" (only for "check-status")'
        ),
      originalUrl: z
        .string()
        .nullable()
        .describe('URL of the processed media (only when status is "ready")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    if (ctx.input.action === 'initiate') {
      if (!ctx.input.fileName) {
        throw new Error('fileName is required when action is "initiate"');
      }

      let result = await client.initiateMediaUpload(ctx.input.socialSetId, ctx.input.fileName);

      return {
        output: {
          mediaId: result.media_id,
          uploadUrl: result.upload_url,
          status: null,
          originalUrl: null
        },
        message: `Media upload initiated for **${ctx.input.fileName}**. Media ID: \`${result.media_id}\`. Upload the file to the provided URL via PUT request.`
      };
    }

    if (!ctx.input.mediaId) {
      throw new Error('mediaId is required when action is "check-status"');
    }

    let status = await client.getMediaStatus(ctx.input.socialSetId, ctx.input.mediaId);

    return {
      output: {
        mediaId: status.media_id,
        uploadUrl: null,
        status: status.status,
        originalUrl: status.media_urls?.original ?? null
      },
      message: `Media \`${status.media_id}\` status: **${status.status}**${status.status === 'ready' ? ' — ready to be attached to a draft' : ''}`
    };
  })
  .build();
