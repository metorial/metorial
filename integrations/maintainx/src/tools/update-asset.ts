import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Updates an existing asset in MaintainX. Can modify name, description, metadata, location, and associations. Only provided fields will be updated.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      assetId: z.number().describe('ID of the asset to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      barcode: z.string().optional().describe('New barcode'),
      serialNumber: z.string().optional().describe('New serial number'),
      manufacturer: z.string().optional().describe('New manufacturer'),
      model: z.string().optional().describe('New model'),
      locationId: z.number().optional().describe('New location ID'),
      parentId: z.number().optional().describe('New parent asset ID'),
      teamIds: z.array(z.number()).optional().describe('New team IDs'),
      assetTypes: z.array(z.string()).optional().describe('New asset type classifications'),
      vendorIds: z.array(z.number()).optional().describe('New vendor IDs')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the updated asset'),
      name: z.string().optional().describe('Name of the asset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.barcode !== undefined) updateData.barcode = ctx.input.barcode;
    if (ctx.input.serialNumber !== undefined) updateData.serialNumber = ctx.input.serialNumber;
    if (ctx.input.manufacturer !== undefined) updateData.manufacturer = ctx.input.manufacturer;
    if (ctx.input.model !== undefined) updateData.model = ctx.input.model;
    if (ctx.input.locationId !== undefined) updateData.locationId = ctx.input.locationId;
    if (ctx.input.parentId !== undefined) updateData.parentId = ctx.input.parentId;
    if (ctx.input.teamIds !== undefined) updateData.teamIds = ctx.input.teamIds;
    if (ctx.input.assetTypes !== undefined) updateData.assetTypes = ctx.input.assetTypes;
    if (ctx.input.vendorIds !== undefined) updateData.vendorIds = ctx.input.vendorIds;

    let result = await client.updateAsset(ctx.input.assetId, updateData);
    let asset = result.asset ?? result;

    return {
      output: {
        assetId: asset.id ?? ctx.input.assetId,
        name: asset.name ?? ctx.input.name
      },
      message: `Updated asset **#${ctx.input.assetId}**${ctx.input.name ? ` — name set to "${ctx.input.name}"` : ''}.`
    };
  })
  .build();
