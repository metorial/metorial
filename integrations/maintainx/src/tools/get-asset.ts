import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieves detailed information about a specific asset by ID, including its name, description, serial number, manufacturer, model, location, status, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.getAsset(ctx.input.assetId);
    let asset = result.asset ?? result;

    return {
      output: {
        assetId: asset.id,
        name: asset.name,
        description: asset.description,
        barcode: asset.barcode,
        serialNumber: asset.serialNumber,
        manufacturer: asset.manufacturer,
        model: asset.model,
        locationId: asset.locationId,
        parentId: asset.parentId,
        status: asset.status,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      },
      message: `Asset **#${asset.id}**: "${asset.name}"${asset.status ? ` — status: **${asset.status}**` : ''}.`
    };
  })
  .build();
