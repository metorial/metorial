import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { programIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let locationSchema = z.object({
  raw: z.record(z.string(), z.any()).optional().describe('Complete provider resource'),
  locationId: z.string().describe('Unique identifier of the location'),
  brandId: z.string().optional().describe('ID of the brand this location belongs to'),
  programId: z.string().optional().describe('ID of the program this location belongs to'),
  accountId: z.string().optional().describe('Account ID'),
  address: z.string().optional().describe('Street address of the location'),
  city: z.string().optional().describe('City of the location'),
  countryCode: z.string().optional().describe('ISO 3166-1 alpha-3 country code'),
  postcode: z.string().optional().describe('Postal/ZIP code'),
  live: z.boolean().optional().describe('Whether the location is in live mode'),
  status: z.string().optional().describe('Onboarding status of the location'),
  geolocation: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional()
    .describe('Geographic coordinates of the location'),
  created: z.string().optional().describe('ISO 8601 date when the location was created'),
  updated: z.string().optional().describe('ISO 8601 date when the location was last updated'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
});

export let createLocation = SlateTool.create(spec, {
  name: 'Create Location',
  key: 'create_location',
  description: `Creates a new Location under a Program for a specific Brand. Locations represent physical or online stores identified by Merchant IDs (MIDs) where transactions from linked cards will be tracked.`,
  instructions: [
    'Country code must be ISO 3166-1 alpha-3 format (e.g., GBR, USA, IRL, CAN, SWE, DNK, FIN, JPN, NOR).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: programIdInput,
      brandId: z.string().describe('ID of the brand this location belongs to'),
      address: z.string().describe('Street address of the location'),
      city: z.string().describe('City of the location'),
      countryCode: z
        .string()
        .describe(
          'ISO 3166-1 alpha-3 country code (e.g., GBR, USA, IRL, CAN, SWE, DNK, FIN, JPN, NOR)'
        ),
      postcode: z.string().describe('Postal/ZIP code of the location'),
      geolocation: z
        .object({
          latitude: z.number().describe('Latitude'),
          longitude: z.number().describe('Longitude')
        })
        .optional()
        .describe(
          'Legacy coordinate input; current Fidel location creation documents address and merchant-ID search instead'
        ),
      stateCode: z.string().optional().describe('Two-letter US state code for USA locations'),
      searchBy: z
        .object({
          merchantIds: z
            .object({
              amex: z.array(z.string()).optional(),
              mastercard: z.array(z.string()).optional(),
              visa: z.array(z.string()).optional()
            })
            .optional()
        })
        .optional()
        .describe('Known merchant IDs to match this location'),
      status: z.string().optional().describe('Set syncing to auto-sync live locations'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata to attach')
    })
  )
  .output(locationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let location = await client.createLocation(ctx.input.brandId, ctx.input.programId, {
      address: ctx.input.address,
      city: ctx.input.city,
      countryCode: ctx.input.countryCode,
      postcode: ctx.input.postcode,
      geolocation: ctx.input.geolocation,
      stateCode: ctx.input.stateCode,
      searchBy: ctx.input.searchBy,
      status: ctx.input.status,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        raw: location,
        locationId: location.id,
        brandId: location.brandId,
        programId: location.programId ?? undefined,
        accountId: location.accountId ?? undefined,
        address: location.address,
        city: location.city,
        countryCode: location.countryCode,
        postcode: location.postcode,
        live: location.live,
        status: location.status ?? undefined,
        geolocation: location.geolocation ?? undefined,
        created: location.created,
        updated: location.updated,
        metadata: location.metadata ?? undefined
      },
      message: `Location created at **${ctx.input.address}, ${ctx.input.city}** with ID \`${location.id}\`.`
    };
  })
  .build();

export let getLocation = SlateTool.create(spec, {
  name: 'Get Location',
  key: 'get_location',
  description: `Retrieves details of a specific Location by its ID, including its address, status, and onboarding information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to retrieve'),
      programId: programIdInput
    })
  )
  .output(locationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let location = await client.getLocation(ctx.input.locationId, ctx.input.programId);

    return {
      output: {
        raw: location,
        locationId: location.id,
        brandId: location.brandId,
        programId: location.programId ?? undefined,
        accountId: location.accountId ?? undefined,
        address: location.address,
        city: location.city,
        countryCode: location.countryCode,
        postcode: location.postcode,
        live: location.live,
        status: location.status ?? undefined,
        geolocation: location.geolocation ?? undefined,
        created: location.created,
        updated: location.updated,
        metadata: location.metadata ?? undefined
      },
      message: `Retrieved location **${location.address ?? location.id}** (\`${location.id}\`).`
    };
  })
  .build();

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Lists all Locations in a specific Program. Returns locations with their addresses, statuses, and onboarding information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: programIdInput,
      cursor: z
        .string()
        .optional()
        .describe('JSON.stringify(last) from the previous page. Do not URL-encode it.'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort by creation date'),
      start: z.number().optional().describe('Offset for pagination'),
      brandId: z
        .string()
        .optional()
        .describe('Filter locations to a brand; discover IDs with list_brands'),
      postcode: z.string().optional().describe('Filter by postal code'),
      status: z.string().optional().describe('Filter by onboarding status'),
      limit: z.number().optional().describe('Maximum number of locations to return')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('List of locations'),
      last: z
        .any()
        .optional()
        .describe('Provider continuation key; serialize it as JSON for cursor'),
      raw: z.record(z.string(), z.any()).optional().describe('Complete provider response'),
      count: z.number().optional().describe('Number of returned locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listLocations(ctx.input.programId, {
      start: ctx.input.start,
      cursor: ctx.input.cursor,
      order: ctx.input.order,
      limit: ctx.input.limit,
      brandId: ctx.input.brandId,
      postcode: ctx.input.postcode,
      status: ctx.input.status
    });

    let items = data?.items ?? [];
    let locations = items.map((l: any) => ({
      raw: l,
      locationId: l.id,
      brandId: l.brandId,
      programId: l.programId ?? undefined,
      accountId: l.accountId ?? undefined,
      address: l.address,
      city: l.city,
      countryCode: l.countryCode,
      postcode: l.postcode,
      live: l.live,
      status: l.status ?? undefined,
      geolocation: l.geolocation ?? undefined,
      created: l.created,
      updated: l.updated,
      metadata: l.metadata ?? undefined
    }));

    return {
      output: {
        locations,
        count: data?.count,
        last: data?.last,
        raw: data.rawResponse ?? data
      },
      message: `Found **${locations.length}** location(s) in program \`${ctx.input.programId}\`.`
    };
  })
  .build();

export let deleteLocation = SlateTool.create(spec, {
  name: 'Delete Location',
  key: 'delete_location',
  description: `Deletes a Location from a Program. This is a destructive action that cannot be undone and will stop transaction tracking at this location.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to delete'),
      programId: programIdInput
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('ID of the deleted location'),
      deleted: z.boolean().describe('Whether the location was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteLocation(ctx.input.locationId, ctx.input.programId);

    return {
      output: {
        locationId: ctx.input.locationId,
        deleted: true
      },
      message: `Location \`${ctx.input.locationId}\` deleted successfully.`
    };
  })
  .build();
