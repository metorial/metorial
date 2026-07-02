import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Lists all locations configured in MaintainX. Locations can be associated with assets, work orders, vendors, and teams.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
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
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listLocations({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let locations = (result.locations ?? []).map((l: any) => ({
      locationId: l.id,
      name: l.name,
      address: l.address,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
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
