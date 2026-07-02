import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `List all store locations. Locations are where inventory is stocked and orders are fulfilled from. Use location IDs with inventory management tools.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(
        z.object({
          locationId: z.string(),
          name: z.string(),
          address1: z.string().nullable(),
          address2: z.string().nullable(),
          city: z.string().nullable(),
          province: z.string().nullable(),
          country: z.string().nullable(),
          zip: z.string().nullable(),
          phone: z.string().nullable(),
          active: z.boolean(),
          legacy: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let locations = await client.listLocations();

    let mapped = locations.map((l: any) => ({
      locationId: String(l.id),
      name: l.name,
      address1: l.address1,
      address2: l.address2,
      city: l.city,
      province: l.province,
      country: l.country_name || l.country,
      zip: l.zip,
      phone: l.phone,
      active: l.active,
      legacy: l.legacy
    }));

    return {
      output: { locations: mapped },
      message: `Found **${mapped.length}** location(s).`
    };
  })
  .build();
