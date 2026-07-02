import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let manageGallery = SlateTool.create(spec, {
  name: 'Manage Gallery',
  key: 'manage_gallery',
  description: `Update, delete, or manage a Cincopa gallery. Use this to rename a gallery, change its description or template, delete it (with optional asset cleanup), set a featured/master asset, or generate a downloadable zip of gallery contents.`,
  instructions: [
    'Provide the gallery ID (fid) to identify which gallery to manage.',
    'Set the action to "update", "delete", "set_master", or "zip".',
    'For "delete", optionally set deleteAssets to true to also remove all assets in the gallery.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      galleryId: z.string().describe('Gallery ID (fid) to manage'),
      action: z
        .enum(['update', 'delete', 'set_master', 'zip'])
        .describe('Action to perform on the gallery'),
      name: z.string().optional().describe('New name (for update action)'),
      description: z.string().optional().describe('New description (for update action)'),
      template: z.string().optional().describe('New template ID (for update action)'),
      deleteAssets: z
        .boolean()
        .optional()
        .describe('Whether to also delete all assets when deleting the gallery'),
      masterAssetId: z
        .string()
        .optional()
        .describe('Asset ID (rid) to set as featured/master (for set_master action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      downloadUrl: z.string().optional().describe('Download URL for zip action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action, galleryId } = ctx.input;
    let data: any;

    if (action === 'update') {
      data = await client.updateGallery({
        galleryId,
        name: ctx.input.name,
        description: ctx.input.description,
        template: ctx.input.template
      });
      return {
        output: { success: data.success === true },
        message: `Gallery \`${galleryId}\` updated successfully.`
      };
    }

    if (action === 'delete') {
      data = await client.deleteGallery({
        galleryId,
        deleteAssets: ctx.input.deleteAssets
      });
      return {
        output: { success: data.success === true },
        message: `Gallery \`${galleryId}\` deleted${ctx.input.deleteAssets ? ' along with all its assets' : ''}.`
      };
    }

    if (action === 'set_master') {
      if (!ctx.input.masterAssetId) {
        throw new Error('masterAssetId is required for set_master action');
      }
      data = await client.setGalleryMaster({
        galleryId,
        rid: ctx.input.masterAssetId
      });
      return {
        output: { success: data.success === true },
        message: `Asset \`${ctx.input.masterAssetId}\` set as master for gallery \`${galleryId}\`.`
      };
    }

    if (action === 'zip') {
      data = await client.zipGallery(galleryId);
      return {
        output: {
          success: data.success === true,
          downloadUrl: data.url || data.download_url
        },
        message: `Zip file generated for gallery \`${galleryId}\`.${data.url || data.download_url ? ` Download: ${data.url || data.download_url}` : ''}`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
