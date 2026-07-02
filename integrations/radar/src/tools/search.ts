import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

export let autocompleteTool = SlateTool.create(spec, {
  name: 'Autocomplete',
  key: 'autocomplete',
  description: `Address and place autocomplete for search boxes and forms. Provide a partial address or place name and get matching results. Optionally bias results toward a location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial address or place name to autocomplete'),
      latitude: z.number().optional().describe('Latitude to bias results toward'),
      longitude: z.number().optional().describe('Longitude to bias results toward'),
      layers: z
        .string()
        .optional()
        .describe(
          'Comma-separated result layers: place, address, postalCode, locality, county, state, country'
        ),
      limit: z.number().optional().describe('Max results (1-100, default 10)'),
      countryCode: z
        .string()
        .optional()
        .describe('Comma-separated 2-letter country codes to restrict results')
    })
  )
  .output(
    z.object({
      addresses: z
        .array(
          z.object({
            latitude: z.number().optional().describe('Latitude'),
            longitude: z.number().optional().describe('Longitude'),
            formattedAddress: z.string().optional().describe('Full formatted address'),
            addressLabel: z.string().optional().describe('Short address label'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            stateCode: z.string().optional().describe('State code'),
            postalCode: z.string().optional().describe('Postal code'),
            country: z.string().optional().describe('Country'),
            countryCode: z.string().optional().describe('Country code'),
            layer: z.string().optional().describe('Result layer type')
          })
        )
        .describe('Autocomplete results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let near =
      ctx.input.latitude !== undefined && ctx.input.longitude !== undefined
        ? `${ctx.input.latitude},${ctx.input.longitude}`
        : undefined;

    let result = await client.autocomplete({
      query: ctx.input.query,
      near,
      layers: ctx.input.layers,
      limit: ctx.input.limit,
      countryCode: ctx.input.countryCode
    });

    let addresses = (result.addresses || []).map((a: any) => ({
      latitude: a.latitude,
      longitude: a.longitude,
      formattedAddress: a.formattedAddress,
      addressLabel: a.addressLabel,
      city: a.city,
      state: a.state,
      stateCode: a.stateCode,
      postalCode: a.postalCode,
      country: a.country,
      countryCode: a.countryCode,
      layer: a.layer
    }));

    return {
      output: { addresses },
      message: `Autocomplete returned **${addresses.length}** result(s) for "${ctx.input.query}".`
    };
  })
  .build();

export let searchPlacesTool = SlateTool.create(spec, {
  name: 'Search Places',
  key: 'search_places',
  description: `Search for nearby points of interest (places) by category or chain. Returns places sorted by distance from the specified location.`,
  constraints: ['Rate limited to 150 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the search center'),
      longitude: z.number().describe('Longitude of the search center'),
      chains: z
        .string()
        .optional()
        .describe('Comma-separated chain slugs (e.g., "starbucks,walmart")'),
      categories: z
        .string()
        .optional()
        .describe('Comma-separated category slugs (e.g., "food-beverage,coffee-shop")'),
      radius: z.number().optional().describe('Search radius in meters'),
      limit: z.number().optional().describe('Max results (1-100, default 100)')
    })
  )
  .output(
    z.object({
      places: z
        .array(
          z.object({
            placeId: z.string().describe('Radar place ID'),
            name: z.string().optional().describe('Place name'),
            chainName: z.string().optional().describe('Chain name'),
            chainSlug: z.string().optional().describe('Chain slug'),
            categories: z.array(z.string()).optional().describe('Place categories'),
            location: z.any().optional().describe('Place location as GeoJSON Point')
          })
        )
        .describe('Nearby places')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.searchPlaces({
      near: `${ctx.input.latitude},${ctx.input.longitude}`,
      chains: ctx.input.chains,
      categories: ctx.input.categories,
      radius: ctx.input.radius,
      limit: ctx.input.limit
    });

    let places = (result.places || []).map((p: any) => ({
      placeId: p._id,
      name: p.name,
      chainName: p.chain?.name,
      chainSlug: p.chain?.slug,
      categories: p.categories,
      location: p.location
    }));

    return {
      output: { places },
      message: `Found **${places.length}** place(s) near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();

export let searchGeofencesTool = SlateTool.create(spec, {
  name: 'Search Geofences',
  key: 'search_geofences',
  description: `Search for nearby geofences by location. Optionally filter by tags and metadata. Returns geofences sorted by distance.`,
  constraints: ['Rate limited to 100 requests per second.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the search center'),
      longitude: z.number().describe('Longitude of the search center'),
      radius: z.number().optional().describe('Search radius in meters (default 1000)'),
      tags: z.string().optional().describe('Comma-separated geofence tags to filter by'),
      limit: z.number().optional().describe('Max results (1-1000, default 100)'),
      includeGeometry: z
        .boolean()
        .optional()
        .describe('Include full geofence geometry (default true)')
    })
  )
  .output(
    z.object({
      geofences: z
        .array(
          z.object({
            geofenceId: z.string().describe('Radar geofence ID'),
            tag: z.string().optional().describe('Geofence tag'),
            externalId: z.string().optional().describe('Geofence external ID'),
            description: z.string().optional().describe('Geofence description'),
            type: z.string().optional().describe('Geofence type'),
            metadata: z.record(z.string(), z.any()).optional().describe('Geofence metadata'),
            geometryCenter: z.any().optional().describe('Geofence center'),
            geometryRadius: z.number().optional().describe('Geofence radius')
          })
        )
        .describe('Nearby geofences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.searchGeofences({
      near: `${ctx.input.latitude},${ctx.input.longitude}`,
      radius: ctx.input.radius,
      tags: ctx.input.tags,
      limit: ctx.input.limit,
      includeGeometry: ctx.input.includeGeometry
    });

    let geofences = (result.geofences || []).map((g: any) => ({
      geofenceId: g._id,
      tag: g.tag,
      externalId: g.externalId,
      description: g.description,
      type: g.type,
      metadata: g.metadata,
      geometryCenter: g.geometryCenter,
      geometryRadius: g.geometryRadius
    }));

    return {
      output: { geofences },
      message: `Found **${geofences.length}** geofence(s) near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
