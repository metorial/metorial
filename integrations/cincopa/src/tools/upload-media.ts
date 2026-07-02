import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Upload media to Cincopa from a remote URL or generate an upload URL for direct HTTP POST uploads. Use "from_url" to import media from any publicly accessible URL into a gallery. Use "get_upload_url" to generate a temporary upload endpoint for direct file uploads. Use "check_status" to track progress of a URL-based upload.`,
  instructions: [
    'For "from_url", provide a publicly accessible URL and optionally a gallery ID.',
    'For "get_upload_url", provide an optional gallery ID to upload directly into a gallery.',
    'For "check_status", provide the statusId returned from a previous "from_url" upload.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['from_url', 'get_upload_url', 'check_status'])
        .describe('Upload action to perform'),
      sourceUrl: z
        .string()
        .optional()
        .describe('Public URL of the media file to import (for from_url action)'),
      galleryId: z.string().optional().describe('Gallery ID (fid) to upload into'),
      targetAssetId: z
        .string()
        .optional()
        .describe('Asset ID (rid) to attach the upload to (e.g., as a poster)'),
      assetType: z
        .string()
        .optional()
        .describe('Asset type name when attaching to another asset'),
      title: z
        .string()
        .optional()
        .describe('Title for the uploaded asset (for from_url action)'),
      description: z
        .string()
        .optional()
        .describe('Description for the uploaded asset (for from_url action)'),
      statusId: z
        .string()
        .optional()
        .describe('Status ID to check upload progress (for check_status action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      uploadUrl: z
        .string()
        .optional()
        .describe('Generated upload URL for direct POST uploads'),
      statusId: z
        .string()
        .optional()
        .describe('Status ID for tracking URL-based upload progress'),
      status: z
        .string()
        .optional()
        .describe('Current upload status (for check_status action)'),
      assetId: z
        .string()
        .optional()
        .describe('ID of the created asset (when upload is complete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'from_url') {
      if (!ctx.input.sourceUrl) {
        throw new Error('sourceUrl is required for from_url action');
      }
      let data = await client.uploadFromUrl({
        url: ctx.input.sourceUrl,
        galleryId: ctx.input.galleryId,
        rid: ctx.input.targetAssetId,
        type: ctx.input.assetType,
        title: ctx.input.title,
        description: ctx.input.description
      });
      return {
        output: {
          success: data.success === true,
          statusId: data.status_id || data.id,
          assetId: data.rid
        },
        message: `Upload from URL initiated.${data.status_id ? ` Track progress with status ID \`${data.status_id}\`.` : ''}`
      };
    }

    if (action === 'get_upload_url') {
      let data = await client.getUploadUrl({
        galleryId: ctx.input.galleryId,
        rid: ctx.input.targetAssetId,
        type: ctx.input.assetType
      });
      return {
        output: {
          success: data.success === true,
          uploadUrl: data.upload_url || data.url
        },
        message: `Upload URL generated: ${data.upload_url || data.url}`
      };
    }

    if (action === 'check_status') {
      if (!ctx.input.statusId) {
        throw new Error('statusId is required for check_status action');
      }
      let data = await client.getUploadFromUrlStatus(ctx.input.statusId);
      return {
        output: {
          success: data.success === true,
          status: data.status,
          assetId: data.rid
        },
        message: `Upload status: **${data.status || 'unknown'}**${data.rid ? ` — Asset ID: \`${data.rid}\`` : ''}`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
