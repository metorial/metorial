import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let assetSchema = z.object({
  assetId: z.number().describe('Asset ID'),
  name: z.string().optional().describe('Asset name'),
  customerId: z.number().optional().describe('Owner customer ID'),
  assetType: z.string().optional().describe('Asset type name'),
  assetSerial: z.string().optional().describe('Serial number'),
  properties: z.record(z.string(), z.any()).optional().describe('Custom properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapAsset = (a: any) => ({
  assetId: a.id,
  name: a.name,
  customerId: a.customer_id,
  assetType: a.asset_type,
  assetSerial: a.asset_serial,
  properties: a.properties,
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

export let searchAssets = SlateTool.create(spec, {
  name: 'Search Assets',
  key: 'search_assets',
  description: `Search and list customer assets (devices, equipment). Filter by customer, asset type, or search query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for asset name or serial'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      assetTypeId: z.number().optional().describe('Filter by asset type ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      assets: z.array(assetSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listAssets(ctx.input);
    let assets = (result.assets || []).map(mapAsset);

    return {
      output: {
        assets,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${assets.length}** asset(s).`
    };
  })
  .build();

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve detailed information about a specific customer asset including serial number and custom properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.number().describe('The asset ID to retrieve')
    })
  )
  .output(assetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getAsset(ctx.input.assetId);
    let a = result.asset || result;

    return {
      output: mapAsset(a),
      message: `Retrieved asset **${a.name || a.id}**${a.asset_serial ? ` (S/N: ${a.asset_serial})` : ''}.`
    };
  })
  .build();

export let createAsset = SlateTool.create(spec, {
  name: 'Create Asset',
  key: 'create_asset',
  description: `Create a new customer asset (device, equipment) to track for repairs and service.`
})
  .input(
    z.object({
      name: z.string().describe('Asset name/description'),
      customerId: z.number().optional().describe('Customer ID who owns this asset'),
      assetTypeName: z
        .string()
        .optional()
        .describe('Asset type name (e.g. "Laptop", "Desktop")'),
      assetTypeId: z.number().optional().describe('Asset type ID'),
      assetSerial: z.string().optional().describe('Serial number'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties as key-value pairs')
    })
  )
  .output(assetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createAsset(ctx.input);
    let a = result.asset || result;

    return {
      output: mapAsset(a),
      message: `Created asset **${a.name}** (ID: ${a.id}).`
    };
  })
  .build();

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update an existing customer asset's information.`
})
  .input(
    z.object({
      assetId: z.number().describe('The asset ID to update'),
      name: z.string().optional().describe('Updated asset name'),
      customerId: z.number().optional().describe('Updated customer ID'),
      assetTypeName: z.string().optional().describe('Updated asset type name'),
      assetTypeId: z.number().optional().describe('Updated asset type ID'),
      assetSerial: z.string().optional().describe('Updated serial number'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom properties')
    })
  )
  .output(assetSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { assetId, ...updateData } = ctx.input;
    let result = await client.updateAsset(assetId, updateData);
    let a = result.asset || result;

    return {
      output: mapAsset(a),
      message: `Updated asset **${a.name || a.id}**.`
    };
  })
  .build();
