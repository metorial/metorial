import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validatePeriod } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let getInventoryAvailability = SlateTool.create(spec, {
  name: 'Get Inventory Availability',
  key: 'get_inventory_availability',
  description:
    'Get available and plannable quantities for a product at a location over an exact rental period, including booking rules such as buffer times. Use list_product_variations and list_locations to discover IDs.',
  instructions: [
    'Rental dates are company-local wall times written with a Z suffix; do not convert them to actual UTC.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z.string().describe('Product variation ID from list_product_variations'),
      locationId: z.string().describe('Location ID from list_locations'),
      from: z.string().describe('Rental start in ISO 8601 format'),
      till: z.string().describe('Rental end in ISO 8601 format')
    })
  )
  .output(z.object({ availability: z.array(z.record(z.string(), z.any())) }))
  .handleInvocation(async ctx => {
    validatePeriod(ctx.input.from, ctx.input.till);
    let response = await new Client(buildClientConfig(ctx)).listResource(
      'inventory_availabilities',
      {
        filters: {
          item_id: ctx.input.productId,
          location_id: ctx.input.locationId,
          from: ctx.input.from,
          till: ctx.input.till
        }
      }
    );
    let availability = flattenResourceList(response);
    return {
      output: { availability },
      message: `Retrieved ${availability.length} availability record(s). Products without inventory are omitted by Booqable.`
    };
  })
  .build();
