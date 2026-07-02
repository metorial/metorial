import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmpClient } from '../lib/cmp-client';
import { spec } from '../spec';

export let manageCmpAsset = SlateTool.create(spec, {
  name: 'Manage CMP Asset',
  key: 'manage_cmp_asset',
  description: `Retrieve, update, delete, or list assets in the Optimizely Content Marketing Platform library.
Assets include images, videos, articles, raw files, and structured content. Use this to browse, search, and manage assets and folders.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update', 'delete', 'list', 'list_folders', 'get_folder'])
        .describe('Action to perform'),
      assetId: z.string().optional().describe('Asset ID (required for get, update, delete)'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID (for filtering assets or get_folder)'),
      parentFolderId: z.string().optional().describe('Parent folder ID (for list_folders)'),
      name: z.string().optional().describe('Asset name (for update)'),
      assetType: z
        .string()
        .optional()
        .describe(
          'Filter by asset type: image, video, article, raw_file, structured_content (for list)'
        ),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata to set on the asset (for update)'),
      page: z.number().optional().describe('Page number (for list)'),
      limit: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      asset: z.any().optional().describe('Asset data'),
      assets: z.array(z.any()).optional().describe('List of assets'),
      folder: z.any().optional().describe('Folder data'),
      folders: z.array(z.any()).optional().describe('List of folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CmpClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listAssets({
          page: ctx.input.page,
          limit: ctx.input.limit,
          folder_id: ctx.input.folderId,
          type: ctx.input.assetType
        });
        let assets = result.data || result;
        return {
          output: { assets: Array.isArray(assets) ? assets : [] },
          message: `Listed CMP assets.`
        };
      }
      case 'get': {
        if (!ctx.input.assetId) throw new Error('assetId is required');
        let asset = await client.getAsset(ctx.input.assetId);
        return {
          output: { asset },
          message: `Retrieved CMP asset **${asset.name || ctx.input.assetId}**.`
        };
      }
      case 'update': {
        if (!ctx.input.assetId) throw new Error('assetId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.metadata !== undefined) updateData.metadata = ctx.input.metadata;
        let asset = await client.updateAsset(ctx.input.assetId, updateData);
        return {
          output: { asset },
          message: `Updated CMP asset **${asset.name || ctx.input.assetId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.assetId) throw new Error('assetId is required');
        await client.deleteAsset(ctx.input.assetId);
        return {
          output: {},
          message: `Deleted CMP asset ${ctx.input.assetId}.`
        };
      }
      case 'list_folders': {
        let result = await client.listFolders({ parent_id: ctx.input.parentFolderId });
        let folders = result.data || result;
        return {
          output: { folders: Array.isArray(folders) ? folders : [] },
          message: `Listed CMP folders.`
        };
      }
      case 'get_folder': {
        if (!ctx.input.folderId) throw new Error('folderId is required');
        let folder = await client.getFolder(ctx.input.folderId);
        return {
          output: { folder },
          message: `Retrieved CMP folder **${folder.name || ctx.input.folderId}**.`
        };
      }
    }
  })
  .build();
