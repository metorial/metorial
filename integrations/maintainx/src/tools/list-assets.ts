import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `Lists assets from MaintainX with optional filtering by location. Supports cursor-based pagination. Returns a summary of each asset.`,
  constraints: ['Maximum 200 results per page. Use cursor for pagination.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.number().optional().describe('Filter by location ID'),
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      assets: z
        .array(
          z.object({
            assetId: z.number().describe('Asset ID'),
            name: z.string().optional().describe('Name'),
            description: z.string().optional().describe('Description'),
            serialNumber: z.string().optional().describe('Serial number'),
            manufacturer: z.string().optional().describe('Manufacturer'),
            model: z.string().optional().describe('Model'),
            locationId: z.number().optional().describe('Location ID'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of assets'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listAssets({
      locationId: ctx.input.locationId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let assets = (result.assets ?? []).map((a: any) => ({
      assetId: a.id,
      name: a.name,
      description: a.description,
      serialNumber: a.serialNumber,
      manufacturer: a.manufacturer,
      model: a.model,
      locationId: a.locationId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return {
      output: {
        assets,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${assets.length}** asset(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
