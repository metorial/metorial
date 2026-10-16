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
        .describe(
          'Use "options" for the complete unpaginated selection list; limit, offset, and sort apply only to full format'
        ),
      limit: z.number().optional().describe('Maximum number of locations to return per page'),
      offset: z
        .number()
        .optional()
        .describe(
          'Zero-based starting item offset; use the provider Link header to continue pagination'
        ),
      sort: z
        .string()
        .optional()
        .describe('Property to sort by; prefix with - for descending order')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete original provider response'),
      linkHeader: z
        .string()
        .optional()
        .describe(
          'Provider Link header with self, next, and previous page URLs when available'
        ),
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
      let { data: result, raw, linkHeader } = await client.getLocationOptions();
      return {
        output: {
          raw,
          linkHeader,
          totalCount: result.items.length,
          locations: result.items.map(loc => ({
            locationId: String(loc.id),
            name: loc.name
          }))
        },
        message: `Retrieved ${result.items.length} locations (options format) out of ${result.items.length} total.`
      };
    }

    let {
      data: result,
      raw,
      linkHeader
    } = await client.getLocations({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort
    });

    return {
      output: {
        raw,
        linkHeader,
        totalCount: result.metadata.total_count,
        locations: result.items.map(loc => ({
          locationId: String(loc.id),
          name: loc.name
        }))
      },
      message: `Retrieved ${result.items.length} locations out of ${result.metadata.total_count} total.`
    };
  })
  .build();
