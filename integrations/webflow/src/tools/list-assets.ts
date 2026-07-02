import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List all assets (images, files, etc.) in a Webflow site's Assets panel, along with asset folders. Provides URLs, metadata, and folder organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      includeFolders: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also return asset folders')
    })
  )
  .output(
    z.object({
      assets: z
        .array(
          z.object({
            assetId: z.string().describe('Unique identifier for the asset'),
            displayName: z.string().optional().describe('Display name of the asset'),
            fileName: z.string().optional().describe('Original file name'),
            contentType: z.string().optional().describe('MIME type of the asset'),
            url: z.string().optional().describe('CDN URL of the asset'),
            folderId: z.string().optional().describe('Folder the asset belongs to'),
            createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
            lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
            fileSize: z.number().optional().describe('File size in bytes')
          })
        )
        .describe('List of assets'),
      folders: z
        .array(
          z.object({
            folderId: z.string().describe('Folder identifier'),
            displayName: z.string().optional().describe('Folder name'),
            parentFolderId: z.string().optional().describe('Parent folder ID'),
            createdOn: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .optional()
        .describe('Asset folders (if includeFolders is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let assetsData = await client.listAssets(ctx.input.siteId);

    let assets = (assetsData.assets ?? []).map((a: any) => ({
      assetId: a.id ?? a._id,
      displayName: a.displayName,
      fileName: a.fileName,
      contentType: a.contentType,
      url: a.hostedUrl ?? a.url,
      folderId: a.parentFolder,
      createdOn: a.createdOn,
      lastUpdated: a.lastUpdated,
      fileSize: a.fileSize
    }));

    let folders: any[] | undefined;
    if (ctx.input.includeFolders) {
      let foldersData = await client.listAssetFolders(ctx.input.siteId);
      folders = (foldersData.assetFolders ?? []).map((f: any) => ({
        folderId: f.id ?? f._id,
        displayName: f.displayName,
        parentFolderId: f.parentFolder,
        createdOn: f.createdOn
      }));
    }

    return {
      output: { assets, folders },
      message: `Found **${assets.length}** asset(s)${folders ? ` and **${folders.length}** folder(s)` : ''}.`
    };
  })
  .build();
