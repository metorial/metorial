import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve all business locations associated with the Square account. Returns location names, addresses, statuses, and capabilities. Useful for obtaining location IDs needed by other tools.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(
        z.object({
          locationId: z.string().optional(),
          name: z.string().optional(),
          status: z.string().optional(),
          type: z.string().optional(),
          country: z.string().optional(),
          currency: z.string().optional(),
          timezone: z.string().optional(),
          businessName: z.string().optional(),
          phoneNumber: z.string().optional(),
          websiteUrl: z.string().optional(),
          businessEmail: z.string().optional(),
          description: z.string().optional(),
          address: z.record(z.string(), z.any()).optional(),
          capabilities: z.array(z.string()).optional(),
          merchantId: z.string().optional(),
          createdAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let locations = await client.listLocations();

    let mapped = locations.map(l => ({
      locationId: l.id,
      name: l.name,
      status: l.status,
      type: l.type,
      country: l.country,
      currency: l.currency,
      timezone: l.timezone,
      businessName: l.business_name,
      phoneNumber: l.phone_number,
      websiteUrl: l.website_url,
      businessEmail: l.business_email,
      description: l.description,
      address: l.address,
      capabilities: l.capabilities,
      merchantId: l.merchant_id,
      createdAt: l.created_at
    }));

    return {
      output: { locations: mapped },
      message: `Found **${mapped.length}** location(s).`
    };
  })
  .build();
