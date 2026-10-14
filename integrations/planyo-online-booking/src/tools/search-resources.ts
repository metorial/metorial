import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let searchResources = SlateTool.create(spec, {
  name: 'Search Available Resources',
  key: 'search_resources',
  description:
    'Finds available resources for a rental period and quantity, with prices and optional custom property filters. Use the returned resource IDs to create a reservation.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startTime: z.string().describe('Desired rental start time or Unix timestamp'),
      endTime: z.string().describe('Desired rental end time or Unix timestamp'),
      quantity: z.number().int().positive().describe('Number of units needed'),
      resourceIds: z
        .string()
        .optional()
        .describe('Limit the search to comma-separated resource IDs'),
      sort: z
        .string()
        .optional()
        .describe('Sort by price, resname, site, location, or prop_res_<property_name>'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of matching resources to return'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom resource property filters, using property names as keys'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Reservation form values that affect prices or booking constraints; use voucher for a discount code'
        )
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource ID for subsequent booking tools'),
            name: z.string().optional().describe('Resource name'),
            siteId: z.string().optional().describe('Site ID'),
            siteName: z.string().optional().describe('Site name'),
            totalPrice: z
              .number()
              .optional()
              .describe('Calculated price for the requested rental'),
            currency: z.string().optional().describe('Currency code'),
            properties: z.any().optional().describe('Custom resource properties')
          })
        )
        .describe('Resources available for the requested period'),
      reasonsNotListed: z.any().optional().describe('Reasons other resources did not match')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);
    let result = await client.searchResources(ctx.input);
    let resources = (result.results || []).map((resource: any) => ({
      resourceId: String(resource.id),
      name: resource.name,
      siteId: resource.site_id != null ? String(resource.site_id) : undefined,
      siteName: resource.site_name,
      totalPrice: resource.total_price != null ? Number(resource.total_price) : undefined,
      currency: resource.currency,
      properties: resource.properties
    }));

    return {
      output: { resources, reasonsNotListed: result.reason_not_listed },
      message: `Found ${resources.length} available resource(s) from ${ctx.input.startTime} to ${ctx.input.endTime}.`
    };
  })
  .build();
