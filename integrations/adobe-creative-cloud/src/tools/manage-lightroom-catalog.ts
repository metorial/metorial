import { SlateTool } from 'slates';
import { z } from 'zod';
import { LightroomClient } from '../lib/lightroom';
import { spec } from '../spec';

export let manageLightroomCatalog = SlateTool.create(spec, {
  name: 'Manage Lightroom Catalog',
  key: 'manage_lightroom_catalog',
  description: `Access a user's Lightroom cloud catalog and browse assets or albums. Retrieve catalog info, list photos/videos, list albums, or get album contents. Use this as the starting point for any Lightroom content operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['getCatalog', 'listAssets', 'listAlbums', 'getAlbumAssets'])
        .describe('Operation to perform'),
      catalogId: z
        .string()
        .optional()
        .describe(
          'Catalog ID (required for listAssets, listAlbums, getAlbumAssets). Get from getCatalog first.'
        ),
      albumId: z.string().optional().describe('Album ID (required for getAlbumAssets)'),
      limit: z.number().optional().describe('Maximum results to return'),
      capturedAfter: z
        .string()
        .optional()
        .describe('Filter assets captured after this date (ISO 8601)'),
      capturedBefore: z
        .string()
        .optional()
        .describe('Filter assets captured before this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      catalogId: z.string().optional().describe('Catalog ID'),
      assets: z
        .array(
          z.object({
            assetId: z.string().describe('Asset ID'),
            name: z.string().optional().describe('Asset filename'),
            type: z.string().optional().describe('Asset subtype (image, video)'),
            captureDate: z.string().optional().describe('Capture date'),
            importedAt: z.string().optional().describe('Import timestamp')
          })
        )
        .optional()
        .describe('List of assets'),
      albums: z
        .array(
          z.object({
            albumId: z.string().describe('Album ID'),
            name: z.string().optional().describe('Album name'),
            assetCount: z.number().optional().describe('Number of assets in album'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of albums')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LightroomClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    switch (ctx.input.operation) {
      case 'getCatalog': {
        let result = await client.getCatalog();
        let catalogId = result.id || result.catalog?.id;
        return {
          output: { catalogId },
          message: `Retrieved Lightroom catalog: \`${catalogId}\``
        };
      }
      case 'listAssets': {
        if (!ctx.input.catalogId) throw new Error('catalogId is required for listAssets');
        let result = await client.listAssets(ctx.input.catalogId, {
          limit: ctx.input.limit,
          capturedAfter: ctx.input.capturedAfter,
          capturedBefore: ctx.input.capturedBefore
        });
        let resources = result.resources || [];
        let assets = resources.map((a: any) => ({
          assetId: a.id || a.asset_id,
          name: a.payload?.importSource?.fileName || a.name,
          type: a.subtype,
          captureDate: a.payload?.captureDate,
          importedAt: a.created
        }));
        return {
          output: { catalogId: ctx.input.catalogId, assets },
          message: `Found **${assets.length}** assets in catalog.`
        };
      }
      case 'listAlbums': {
        if (!ctx.input.catalogId) throw new Error('catalogId is required for listAlbums');
        let result = await client.listAlbums(ctx.input.catalogId, { limit: ctx.input.limit });
        let resources = result.resources || [];
        let albums = resources.map((a: any) => ({
          albumId: a.id || a.album_id,
          name: a.payload?.name || a.name,
          assetCount: a.asset_count || a.payload?.asset_count,
          createdAt: a.created
        }));
        return {
          output: { catalogId: ctx.input.catalogId, albums },
          message: `Found **${albums.length}** albums in catalog.`
        };
      }
      case 'getAlbumAssets': {
        if (!ctx.input.catalogId) throw new Error('catalogId is required for getAlbumAssets');
        if (!ctx.input.albumId) throw new Error('albumId is required for getAlbumAssets');
        let result = await client.listAlbumAssets(ctx.input.catalogId, ctx.input.albumId, {
          limit: ctx.input.limit
        });
        let resources = result.resources || [];
        let assets = resources.map((a: any) => ({
          assetId: a.id || a.asset?.id || a.asset_id,
          name: a.asset?.payload?.importSource?.fileName || a.name,
          type: a.asset?.subtype || a.subtype,
          captureDate: a.asset?.payload?.captureDate,
          importedAt: a.asset?.created || a.created
        }));
        return {
          output: { catalogId: ctx.input.catalogId, assets },
          message: `Found **${assets.length}** assets in album \`${ctx.input.albumId}\`.`
        };
      }
    }
  })
  .build();
