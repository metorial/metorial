import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve all registered hotspot locations associated with your account. Returns location IDs and names. Use the **options** format to get a simplified list suitable for dropdowns or selection interfaces.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      format: z
        .enum(['full', 'options'])
        .default('full')
        .describe('Use "options" for a simplified list suitable for dropdowns'),
      limit: z.number().optional().describe('Maximum number of locations to return per page'),
      offset: z.number().optional().describe('Zero-based page offset for pagination'),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of locations'),
      locations: z
        .array(
          z.object({
            locationId: z.string().describe('Unique location identifier'),
            name: z.string().describe('Location name')
          })
        )
        .describe('List of hotspot locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.format === 'options') {
      let result = await client.getLocationOptions();
      return {
        output: {
          totalCount: result.metadata.total_count,
          locations: (result.items ?? []).map(loc => ({
            locationId: String(loc.id),
            name: loc.name
          }))
        },
        message: `Retrieved ${result.items?.length ?? 0} locations (options format) out of ${result.metadata.total_count} total.`
      };
    }

    let result = await client.getLocations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    return {
      output: {
        totalCount: result.metadata.total_count,
        locations: (result.items ?? []).map(loc => ({
          locationId: String(loc.id),
          name: loc.name
        }))
      },
      message: `Retrieved ${result.items?.length ?? 0} locations out of ${result.metadata.total_count} total.`
    };
  })
  .build();
