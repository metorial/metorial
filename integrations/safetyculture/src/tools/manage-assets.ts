import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAssets = SlateTool.create(spec, {
  name: 'Manage Assets',
  key: 'manage_assets',
  description: `List, get, create, or archive assets. Assets represent physical items, equipment, or locations that can be tracked and linked to inspections and issues.`,
  instructions: [
    'To list assets, set operation to "list".',
    'To get a specific asset, set operation to "get" and provide assetId.',
    'To create, set operation to "create" and provide typeId and optional fields.',
    'To archive, set operation to "archive" and provide assetId.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'get', 'create', 'archive'])
        .describe('The operation to perform'),
      assetId: z.string().optional().describe('Asset ID (for get or archive)'),
      typeId: z.string().optional().describe('Asset type ID (for create)'),
      code: z.string().optional().describe('Asset code identifier (for create)'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values for the asset (for create)'),
      siteId: z.string().optional().describe('Site ID to associate with (for create)'),
      pageSize: z.number().optional().describe('Page size for list'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      assets: z.array(z.any()).optional().describe('List of assets (for list operation)'),
      asset: z.any().optional().describe('Asset details (for get or create)'),
      assetId: z.string().optional().describe('Asset ID (for create or archive)'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.operation) {
      case 'list': {
        let result = await client.listAssets({
          pageSize: ctx.input.pageSize,
          pageToken: ctx.input.pageToken
        });
        return {
          output: {
            assets: result.assets,
            nextPageToken: result.nextPageToken,
            success: true
          },
          message: `Found **${result.assets.length}** assets.${result.nextPageToken ? ' More results available.' : ''}`
        };
      }
      case 'get': {
        if (!ctx.input.assetId) throw new Error('assetId is required for get');
        let asset = await client.getAsset(ctx.input.assetId);
        return {
          output: { asset, assetId: ctx.input.assetId, success: true },
          message: `Retrieved asset **${ctx.input.assetId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.typeId) throw new Error('typeId is required for create');
        let result = await client.createAsset({
          typeId: ctx.input.typeId,
          code: ctx.input.code,
          fields: ctx.input.fields,
          siteId: ctx.input.siteId
        });
        let id = result.id || result.asset_id;
        return {
          output: { asset: result, assetId: id, success: true },
          message: `Created asset **${id}**.`
        };
      }
      case 'archive': {
        if (!ctx.input.assetId) throw new Error('assetId is required for archive');
        await client.archiveAsset(ctx.input.assetId);
        return {
          output: { assetId: ctx.input.assetId, success: true },
          message: `Archived asset **${ctx.input.assetId}**.`
        };
      }
    }
  })
  .build();
