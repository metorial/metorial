import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description: `Retrieves detailed information about a single bookable resource including availability settings, pricing, booking rules, photos, properties, and admin details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z.string().describe('ID of the resource to retrieve')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Resource ID'),
      name: z.string().optional().describe('Resource name'),
      siteId: z.string().optional().describe('Site ID'),
      category: z.string().optional().describe('Resource category'),
      quantity: z.number().optional().describe('Total units available'),
      unitPrice: z.number().optional().describe('Base unit price'),
      currency: z.string().optional().describe('Currency code'),
      timeUnit: z.string().optional().describe('Time unit for bookings (e.g. day, hour)'),
      minRentalTime: z.number().optional().describe('Minimum rental time in time units'),
      maxRentalTime: z.number().optional().describe('Maximum rental time in time units'),
      startHour: z.string().optional().describe('Daily availability start hour'),
      endHour: z.string().optional().describe('Daily availability end hour'),
      confirmationType: z.string().optional().describe('How reservations are confirmed'),
      isPublished: z.boolean().optional().describe('Whether the resource is published'),
      isOvernightStay: z
        .boolean()
        .optional()
        .describe('Whether this is an overnight stay resource'),
      properties: z.any().optional().describe('Custom resource properties'),
      photos: z.any().optional().describe('Resource photos'),
      adminEmail: z.string().optional().describe('Resource administrator email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let r = await client.getResourceInfo(ctx.input.resourceId);

    return {
      output: {
        resourceId: ctx.input.resourceId,
        name: r.name,
        siteId: r.site_id ? String(r.site_id) : undefined,
        category: r.category,
        quantity: r.quantity != null ? Number(r.quantity) : undefined,
        unitPrice: r.unit_price != null ? Number(r.unit_price) : undefined,
        currency: r.currency,
        timeUnit: r.time_unit ? String(r.time_unit) : undefined,
        minRentalTime: r.min_rental_time != null ? Number(r.min_rental_time) : undefined,
        maxRentalTime: r.max_rental_time != null ? Number(r.max_rental_time) : undefined,
        startHour: r.start_hour ? String(r.start_hour) : undefined,
        endHour: r.end_hour ? String(r.end_hour) : undefined,
        confirmationType: r.confirmation_type ? String(r.confirmation_type) : undefined,
        isPublished: r.is_published != null ? Boolean(r.is_published) : undefined,
        isOvernightStay:
          r.is_overnight_stay != null ? Boolean(r.is_overnight_stay) : undefined,
        properties: r.properties,
        photos: r.photos,
        adminEmail: r.resource_admin_email
      },
      message: `Retrieved resource **"${r.name || ctx.input.resourceId}"** with ${r.quantity || 0} unit(s), priced at ${r.currency || ''} ${r.unit_price || 'N/A'} per ${r.time_unit || 'unit'}.`
    };
  })
  .build();
