import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMeters = SlateTool.create(spec, {
  name: 'List Meters',
  key: 'list_meters',
  description: `Lists meters from MaintainX, optionally filtered by asset. Meters track equipment performance metrics like runtime hours, mileage, and pressure for condition-based maintenance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.number().optional().describe('Filter meters by asset ID'),
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      meters: z
        .array(
          z.object({
            meterId: z.number().describe('Meter ID'),
            name: z.string().optional().describe('Meter name'),
            units: z.string().optional().describe('Unit of measurement'),
            assetId: z.number().optional().describe('Associated asset ID'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of meters'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listMeters({
      assetId: ctx.input.assetId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let meters = (result.meters ?? []).map((m: any) => ({
      meterId: m.id,
      name: m.name,
      units: m.units,
      assetId: m.assetId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));

    return {
      output: {
        meters,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${meters.length}** meter(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
