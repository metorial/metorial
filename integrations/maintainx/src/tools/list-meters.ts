import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listMeters = SlateTool.create(spec, {
  name: 'List Meters',
  key: 'list_meters',
  description: `Lists meters from MaintainX, optionally filtered by asset. Meters track equipment performance metrics like runtime hours, mileage, and pressure for condition-based maintenance. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      assetId: z.number().optional().describe('Filter meters by asset ID'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a safe whole number')
        .min(1)
        .max(200)
        .optional()
        .describe('Max results per page (1-200, default 100)'),
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
    let client = Client.fromContext(ctx);

    let result = await client.listMeters({
      assetId: ctx.input.assetId,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let meters = (result.meters ?? []).map((m: any) => ({
      meterId: m.id ?? undefined,
      name: m.name ?? undefined,
      units: m.unit ?? undefined,
      assetId: m.asset?.id ?? undefined,
      createdAt: m.createdAt ?? undefined,
      updatedAt: m.updatedAt ?? undefined
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
