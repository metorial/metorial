import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieves detailed information about a specific asset by ID, including its name, description, serial number, manufacturer, model, location, status, and custom fields. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      assetId: z.number().describe('ID of the asset to retrieve')
    })
  )
  .output(
    z.object({
      assetId: z.number().describe('Asset ID'),
      name: z.string().optional().describe('Name'),
      description: z.string().optional().describe('Description'),
      barcode: z.string().optional().describe('Barcode'),
      serialNumber: z.string().optional().describe('Serial number'),
      manufacturer: z.string().optional().describe('Manufacturer'),
      model: z.string().optional().describe('Model'),
      locationId: z.number().optional().describe('Location ID'),
      parentId: z.number().optional().describe('Parent asset ID'),
      status: z.string().optional().describe('Current asset status'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.getAsset(ctx.input.assetId);
    let asset = result.asset ?? result;

    return {
      output: {
        assetId: asset.id ?? undefined,
        name: asset.name ?? undefined,
        description: asset.description ?? undefined,
        barcode: asset.barcode ?? undefined,
        serialNumber: asset.serialNumber ?? undefined,
        manufacturer: asset.manufacturer ?? undefined,
        model: asset.model ?? undefined,
        locationId: asset.locationId ?? undefined,
        parentId: asset.parentId ?? undefined,
        status: asset.status?.status ?? undefined,
        createdAt: asset.createdAt ?? undefined,
        updatedAt: asset.updatedAt ?? undefined
      },
      message: `Asset **#${asset.id}**: "${asset.name}"${asset.status?.status ? ` — status: **${asset.status.status}**` : ''}.`
    };
  })
  .build();
