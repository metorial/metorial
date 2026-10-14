import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Lists all locations configured in MaintainX. Locations can be associated with assets, work orders, vendors, and teams. For multi-organization keys, call list_organizations and pass organizationId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
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
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Location ID'),
            name: z.string().optional().describe('Location name'),
            address: z.string().optional().describe('Address'),
            createdAt: z.string().optional().describe('Created at'),
            updatedAt: z.string().optional().describe('Updated at')
          })
        )
        .describe('List of locations'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    let result = await client.listLocations({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let locations = (result.locations ?? []).map((l: any) => ({
      locationId: l.id ?? undefined,
      name: l.name ?? undefined,
      address: l.address ?? undefined,
      createdAt: l.createdAt ?? undefined,
      updatedAt: l.updatedAt ?? undefined
    }));

    return {
      output: {
        locations,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${locations.length}** location(s)${result.nextCursor ? ' (more pages available)' : ''}.`
    };
  })
  .build();
