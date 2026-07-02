import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushV4Client } from '../lib/v4-client';
import { spec } from '../spec';

export let manageListing = SlateTool.create(spec, {
  name: 'Manage Business Listing',
  key: 'manage_listing',
  description: `Manage business location data in Semrush Listing Management. Create, update, retrieve, or delete business locations that are distributed across directories.
Requires OAuth 2.0 authentication and a Semrush Local Pro or Business plan. Does not consume API units.`,
  instructions: [
    'Use action "list" to get all locations, "get" for a specific location, "create" to add a new location, "update" to modify, or "delete" to remove.',
    'When creating a location, provide at minimum a business name.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      locationId: z
        .string()
        .optional()
        .describe('Location ID (required for get, update, delete)'),
      businessName: z.string().optional().describe('Business name (required for create)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('ZIP or postal code'),
      country: z.string().optional().describe('Country code (e.g., "US")'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      categories: z.array(z.string()).optional().describe('Business categories'),
      limit: z.number().optional().describe('Maximum number of results (for list)'),
      offset: z.number().optional().describe('Number of results to skip (for list)')
    })
  )
  .output(
    z.object({
      locations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of business locations'),
      location: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Single location details'),
      deleted: z.boolean().optional().describe('Whether the location was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushV4Client({
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list': {
        let locations = await client.getLocations({
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        return {
          output: { locations },
          message: `Found ${locations.length} business locations.`
        };
      }

      case 'get': {
        if (!ctx.input.locationId) throw new Error('locationId is required for get action.');
        let location = await client.getLocation(ctx.input.locationId);
        return {
          output: { location },
          message: `Retrieved location **${ctx.input.locationId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.businessName)
          throw new Error('businessName is required for create action.');
        let location = await client.createLocation({
          name: ctx.input.businessName,
          address: ctx.input.address,
          city: ctx.input.city,
          state: ctx.input.state,
          zip: ctx.input.zip,
          country: ctx.input.country,
          phone: ctx.input.phone,
          website: ctx.input.website,
          categories: ctx.input.categories
        });
        return {
          output: { location },
          message: `Created business location **${ctx.input.businessName}**.`
        };
      }

      case 'update': {
        if (!ctx.input.locationId)
          throw new Error('locationId is required for update action.');
        let updateData: Record<string, unknown> = {};
        if (ctx.input.businessName !== undefined) updateData.name = ctx.input.businessName;
        if (ctx.input.address !== undefined) updateData.address = ctx.input.address;
        if (ctx.input.city !== undefined) updateData.city = ctx.input.city;
        if (ctx.input.state !== undefined) updateData.state = ctx.input.state;
        if (ctx.input.zip !== undefined) updateData.zip = ctx.input.zip;
        if (ctx.input.country !== undefined) updateData.country = ctx.input.country;
        if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
        if (ctx.input.website !== undefined) updateData.website = ctx.input.website;
        if (ctx.input.categories !== undefined) updateData.categories = ctx.input.categories;

        let location = await client.updateLocation(ctx.input.locationId, updateData);
        return {
          output: { location },
          message: `Updated location **${ctx.input.locationId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.locationId)
          throw new Error('locationId is required for delete action.');
        await client.deleteLocation(ctx.input.locationId);
        return {
          output: { deleted: true },
          message: `Deleted location **${ctx.input.locationId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
