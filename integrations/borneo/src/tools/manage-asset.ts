import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageAsset = SlateTool.create(spec, {
  name: 'Manage Asset',
  key: 'manage_asset',
  description: `Create, retrieve, update, list, or delete assets. Assets can be hardware, software, or documentation items tracked within the platform for inventory management.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Action to perform'),
      assetId: z.string().optional().describe('Asset ID (required for get, update, delete)'),
      name: z.string().optional().describe('Asset name; required for create and update'),
      type: z.string().optional().describe('Asset type; required for create and update'),
      description: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the Borneo asset API; omit it'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      typeFilter: z.string().optional().describe('Filter by asset type when listing')
    })
  )
  .output(
    z
      .object({
        asset: z.any().optional().describe('Asset record'),
        assets: z.array(z.any()).optional().describe('List of assets'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, assetId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.type) {
          throw createApiServiceError('name and type are required for creating an asset');
        }
        let result = await client.createAsset({
          name: ctx.input.name,
          type: ctx.input.type,
          description: ctx.input.description
        });
        let data = result;
        return {
          output: { asset: data, success: true },
          message: `Asset **${ctx.input.name}** (${ctx.input.type}) created.`
        };
      }
      case 'get': {
        if (!assetId) throw createApiServiceError('assetId is required for get action');
        let result = await client.getAsset(assetId);
        let data = result;
        return {
          output: { asset: data, success: true },
          message: `Retrieved asset **${assetId}**.`
        };
      }
      case 'list': {
        let result = await client.listAssets({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder,
          type: ctx.input.typeFilter
        });
        let data = result;
        let assets = readList(data, 'assets');
        return {
          output: { assets, success: true, ...listMetadata(data) },
          message: `Found **${assets.length}** asset(s).`
        };
      }
      case 'update': {
        if (!assetId) throw createApiServiceError('assetId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.type !== undefined) updatePayload.type = ctx.input.type;
        if (ctx.input.description !== undefined)
          updatePayload.description = ctx.input.description;

        let result = await client.updateAsset(assetId, updatePayload);
        let data = result;
        return {
          output: { asset: data, success: true },
          message: `Asset **${assetId}** updated.`
        };
      }
      case 'delete': {
        if (!assetId) throw createApiServiceError('assetId is required for delete action');
        await client.deleteAsset(assetId);
        return {
          output: { success: true },
          message: `Asset **${assetId}** deleted.`
        };
      }
    }
  })
  .build();
