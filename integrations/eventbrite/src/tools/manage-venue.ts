import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { validateIntegerFields } from '../lib/validation';
import { spec } from '../spec';

let venueOutputSchema = z.object({
  venueId: z.string().describe('The unique venue ID.'),
  name: z.string().optional().describe('The venue name.'),
  address1: z.string().optional().describe('Address line 1.'),
  address2: z.string().optional().describe('Address line 2.'),
  city: z.string().optional().describe('City.'),
  region: z.string().optional().describe('State/region.'),
  postalCode: z.string().optional().describe('Postal/zip code.'),
  country: z.string().optional().describe('Country code.'),
  latitude: z.string().optional().describe('Latitude coordinate.'),
  longitude: z.string().optional().describe('Longitude coordinate.'),
  capacity: z.number().optional().describe('Venue capacity.')
});

export let manageVenue = SlateTool.create(spec, {
  name: 'Manage Venues',
  key: 'manage_venue',
  description: `Get, list, create, or update venues within an organization. Venues contain address and capacity information and can be associated with events.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'create', 'update']).describe('The action to perform.'),
      venueId: z.string().optional().describe('The venue ID (required for get and update).'),
      organizationId: organizationIdSchema,
      name: z.string().optional().describe('Venue name (required for create).'),
      address1: z.string().optional().describe('Address line 1.'),
      address2: z.string().optional().describe('Address line 2.'),
      city: z.string().optional().describe('City.'),
      region: z.string().optional().describe('State/region.'),
      postalCode: z.string().optional().describe('Postal/zip code.'),
      country: z.string().optional().describe('Two-letter country code (e.g., "US").'),
      capacity: z.number().optional().describe('Venue capacity.'),
      page: z.number().optional().describe('Page number for list pagination.'),
      continuation: z
        .string()
        .optional()
        .describe('Continuation token returned by the previous page.')
    })
  )
  .output(
    z.object({
      venue: venueOutputSchema.optional().describe('The venue (for get, create, and update).'),
      venues: z.array(venueOutputSchema).optional().describe('List of venues (for list).'),
      continuation: z.string().optional().describe('Token to retrieve the next page.'),
      hasMore: z.boolean().optional().describe('Whether there are more pages (for list).')
    })
  )
  .handleInvocation(async ctx => {
    validateIntegerFields(ctx.input, ['page'], 1);
    validateIntegerFields(ctx.input, ['capacity']);
    let client = new Client({ token: ctx.auth.token });

    let mapVenue = (v: any) => ({
      venueId: v.id,
      name: v.name ?? undefined,
      address1: v.address?.address_1 ?? undefined,
      address2: v.address?.address_2 ?? undefined,
      city: v.address?.city ?? undefined,
      region: v.address?.region ?? undefined,
      postalCode: v.address?.postal_code ?? undefined,
      country: v.address?.country ?? undefined,
      latitude: v.address?.latitude ?? undefined,
      longitude: v.address?.longitude ?? undefined,
      capacity: v.capacity ?? undefined
    });

    if (ctx.input.action === 'get') {
      if (!ctx.input.venueId)
        throw createApiServiceError('Venue ID is required for get action.');
      let venue = await client.getVenue(ctx.input.venueId);
      return {
        output: { venue: mapVenue(venue) },
        message: `Retrieved venue **${venue.name}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw createApiServiceError('Organization ID is required for list action.');
      let result = await client.listOrganizationVenues(orgId, {
        continuation: ctx.input.continuation,
        page: ctx.input.page
      });
      let venues = (result.venues || []).map(mapVenue);
      return {
        output: {
          venues,
          continuation: result.pagination?.continuation ?? undefined,
          hasMore: result.pagination?.has_more_items || false
        },
        message: `Found **${venues.length}** venues.`
      };
    }

    if (ctx.input.action === 'create') {
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId)
        throw createApiServiceError('Organization ID is required for create action.');
      if (!ctx.input.name) throw createApiServiceError('Venue name is required.');

      let venue = await client.createVenue(orgId, {
        name: ctx.input.name,
        address: {
          address_1: ctx.input.address1,
          address_2: ctx.input.address2,
          city: ctx.input.city,
          region: ctx.input.region,
          postal_code: ctx.input.postalCode,
          country: ctx.input.country
        },
        capacity: ctx.input.capacity
      });

      return {
        output: { venue: mapVenue(venue) },
        message: `Created venue **${venue.name}** with ID \`${venue.id}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.venueId) throw createApiServiceError('Venue ID is required for update.');
      if (
        [
          'name',
          'address1',
          'address2',
          'city',
          'region',
          'postalCode',
          'country',
          'capacity'
        ].every(field => ctx.input[field as keyof typeof ctx.input] === undefined)
      )
        throw createApiServiceError('Provide at least one venue field to update.');
      let address = pickDefined({
        address_1: ctx.input.address1,
        address_2: ctx.input.address2,
        city: ctx.input.city,
        region: ctx.input.region,
        postal_code: ctx.input.postalCode,
        country: ctx.input.country
      });
      let venue = await client.updateVenue(ctx.input.venueId, {
        name: ctx.input.name,
        address: Object.keys(address).length ? address : undefined,
        capacity: ctx.input.capacity
      });
      return { output: { venue: mapVenue(venue) }, message: `Updated venue \`${venue.id}\`.` };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
