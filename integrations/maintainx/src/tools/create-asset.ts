import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAsset = SlateTool.create(spec, {
  name: 'Create Asset',
  key: 'create_asset',
  description: `Creates a new asset in MaintainX. Assets represent equipment, machines, or other trackable items. Supports setting metadata like serial number, manufacturer, model, location, and parent asset for hierarchical relationships.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the asset'),
      description: z.string().optional().describe('Description of the asset'),
      barcode: z.string().optional().describe('Barcode or QR code identifier'),
      serialNumber: z.string().optional().describe('Serial number'),
      manufacturer: z.string().optional().describe('Manufacturer name'),
      model: z.string().optional().describe('Model name/number'),
      locationId: z.number().optional().describe('Location ID where the asset is located'),
      parentId: z
        .number()
        .optional()
        .describe('Parent asset ID for hierarchical relationships'),
      teamIds: z.array(z.number()).optional().describe('Team IDs associated with this asset'),
      assetTypes: z.array(z.string()).optional().describe('Asset type classifications'),
      vendorIds: z
        .array(z.number())
        .optional()
        .describe('Vendor IDs associated with this asset')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('ID of the created asset'),
      name: z.string().describe('Name of the asset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createAsset({
      name: ctx.input.name,
      description: ctx.input.description,
      barcode: ctx.input.barcode,
      serialNumber: ctx.input.serialNumber,
      manufacturer: ctx.input.manufacturer,
      model: ctx.input.model,
      locationId: ctx.input.locationId,
      parentId: ctx.input.parentId,
      teamIds: ctx.input.teamIds,
      assetTypes: ctx.input.assetTypes,
      vendorIds: ctx.input.vendorIds
    });

    let assetId = result.id ?? result.asset?.id;

    return {
      output: {
        assetId,
        name: ctx.input.name
      },
      message: `Created asset **"${ctx.input.name}"** (ID: ${assetId}).`
    };
  })
  .build();
