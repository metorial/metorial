import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let galleryItems = SlateTool.create(spec, {
  name: 'Gallery Items',
  key: 'gallery_items',
  description: `Get, add, or remove media items from a Cincopa gallery. Use "list" to retrieve all assets in a gallery, "add" to add an existing asset to a gallery, or "remove" to remove an asset from a gallery.`,
  instructions: [
    'Use action "list" to retrieve items in a gallery with pagination.',
    'Use action "add" to add an existing asset (by rid) to a gallery.',
    'Use action "remove" to remove an asset from a gallery. Optionally set deleteAsset to permanently delete it.'
  ]
})
  .input(
    z.object({
      galleryId: z.string().describe('Gallery ID (fid) to operate on'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      assetId: z
        .string()
        .optional()
        .describe('Asset ID (rid) - required for add and remove actions'),
      insertPosition: z
        .enum(['top', 'bottom'])
        .optional()
        .describe('Where to insert the asset (for add action)'),
      deleteAsset: z
        .boolean()
        .optional()
        .describe('Permanently delete the asset when removing (for remove action)'),
      page: z.number().optional().describe('Page number for pagination (for list action)'),
      pageSize: z.number().optional().describe('Number of items per page (for list action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Gallery items (for list action)'),
      totalCount: z.number().optional().describe('Total number of items in the gallery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let { action, galleryId } = ctx.input;

    if (action === 'list') {
      let data = await client.getGalleryItems({
        galleryId,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let items = data?.items || [];
      let totalCount = data?.total_count ?? data?.count ?? items.length;
      return {
        output: {
          success: true,
          items,
          totalCount
        },
        message: `Found **${totalCount}** items in gallery \`${galleryId}\`.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.assetId) {
        throw new Error('assetId is required for add action');
      }
      let data = await client.addItemToGallery({
        galleryId,
        rid: ctx.input.assetId,
        insertPosition: ctx.input.insertPosition
      });
      return {
        output: { success: data.success === true },
        message: `Asset \`${ctx.input.assetId}\` added to gallery \`${galleryId}\`.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.assetId) {
        throw new Error('assetId is required for remove action');
      }
      let data = await client.removeItemFromGallery({
        galleryId,
        rid: ctx.input.assetId,
        deleteAsset: ctx.input.deleteAsset
      });
      return {
        output: { success: data.success === true },
        message: `Asset \`${ctx.input.assetId}\` removed from gallery \`${galleryId}\`${ctx.input.deleteAsset ? ' and permanently deleted' : ''}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
