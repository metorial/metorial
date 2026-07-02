import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mediaAssetSchema = z.object({
  assetId: z.string().describe('Unique asset identifier'),
  folder: z.boolean().describe('Whether this asset is a folder'),
  mimeType: z.string().describe('MIME type of the asset'),
  filename: z.string().describe('Original filename'),
  size: z.number().describe('File size in bytes'),
  url: z.string().describe('Full URL of the asset'),
  thumbnailUrl: z.string().describe('URL of the asset thumbnail'),
  dateCreated: z.string().describe('ISO 8601 creation date'),
  dateUpdated: z.string().describe('ISO 8601 last update date')
});

export let listMediaAssets = SlateTool.create(spec, {
  name: 'List Media Assets',
  key: 'list_media_assets',
  description: `List image assets in a workspace's media library. Returns paginated results including file metadata, URLs, and thumbnails. Use media library assets in image generation for improved performance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list media assets from'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      assets: z.array(mediaAssetSchema).describe('List of media assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listMediaAssets(ctx.input.workspaceId, ctx.input.page);

    let mapped = result.results.map(a => ({
      assetId: a.id,
      folder: a.folder,
      mimeType: a.mimeType,
      filename: a.filename,
      size: a.size,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      dateCreated: a.dateCreated,
      dateUpdated: a.dateUpdated
    }));

    return {
      output: {
        page: result.page,
        totalPages: result.totalPages,
        assets: mapped
      },
      message: `Page **${result.page}** of **${result.totalPages}** — found **${mapped.length}** asset(s).`
    };
  })
  .build();

export let getMediaAsset = SlateTool.create(spec, {
  name: 'Get Media Asset',
  key: 'get_media_asset',
  description: `Retrieve details of a specific media asset from a workspace's library, including its URL, metadata, and thumbnail.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace containing the asset'),
      assetId: z.string().describe('ID of the media asset to retrieve')
    })
  )
  .output(mediaAssetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let asset = await client.getMediaAsset(ctx.input.workspaceId, ctx.input.assetId);

    return {
      output: {
        assetId: asset.id,
        folder: asset.folder,
        mimeType: asset.mimeType,
        filename: asset.filename,
        size: asset.size,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        dateCreated: asset.dateCreated,
        dateUpdated: asset.dateUpdated
      },
      message: `Asset **${asset.filename}** (${asset.mimeType}, ${asset.size} bytes).`
    };
  })
  .build();

export let deleteMediaAsset = SlateTool.create(spec, {
  name: 'Delete Media Asset',
  key: 'delete_media_asset',
  description: `Delete a media asset from a workspace's library. This permanently removes the image file from the media library.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace containing the asset'),
      assetId: z.string().describe('ID of the media asset to delete')
    })
  )
  .output(mediaAssetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let asset = await client.deleteMediaAsset(ctx.input.workspaceId, ctx.input.assetId);

    return {
      output: {
        assetId: asset.id,
        folder: asset.folder,
        mimeType: asset.mimeType,
        filename: asset.filename,
        size: asset.size,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        dateCreated: asset.dateCreated,
        dateUpdated: asset.dateUpdated
      },
      message: `Deleted media asset **${asset.filename}**.`
    };
  })
  .build();
