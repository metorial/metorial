import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMaps = SlateTool.create(spec, {
  name: 'List Maps',
  key: 'list_maps',
  description: `Retrieve all maps in your NiftyImages account, or get details and search locations for a specific map. Use a returned map URL as mapId when managing locations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z
        .string()
        .optional()
        .describe(
          'Numeric map image ID or map URL returned by List Maps. If provided, retrieves this map; otherwise lists all maps.'
        ),
      searchLatitude: z
        .number()
        .optional()
        .describe('Latitude for location search (requires mapId).'),
      searchLongitude: z
        .number()
        .optional()
        .describe('Longitude for location search (requires mapId).'),
      searchRadius: z
        .number()
        .optional()
        .describe(
          'Legacy per-search radius option (requires mapId and both coordinates). The public v1 reference does not confirm that this option changes search results.'
        ),
      searchQuery: z
        .string()
        .optional()
        .describe('Address text to match when searching locations (requires mapId).')
    })
  )
  .output(
    z.object({
      maps: z
        .array(z.any())
        .optional()
        .describe('List of all maps (when no mapId is provided).'),
      mapDetails: z
        .any()
        .optional()
        .describe('Details of a specific map (when mapId is provided).'),
      locations: z
        .array(z.any())
        .optional()
        .describe('Search results for locations (when search parameters are provided).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let hasSearchParams =
      ctx.input.searchLatitude !== undefined ||
      ctx.input.searchLongitude !== undefined ||
      ctx.input.searchRadius !== undefined ||
      ctx.input.searchQuery !== undefined;
    if (hasSearchParams && !ctx.input.mapId) {
      throw createApiServiceError(
        'Provide mapId when searching map locations. Call List Maps to find the map URL.'
      );
    }
    if (
      (ctx.input.searchLatitude === undefined) !==
      (ctx.input.searchLongitude === undefined)
    ) {
      throw createApiServiceError(
        'Provide both searchLatitude and searchLongitude for a coordinate search.'
      );
    }
    if (ctx.input.searchQuery !== undefined && ctx.input.searchLatitude !== undefined) {
      throw createApiServiceError(
        'Use either searchQuery or a latitude/longitude pair for a location search.'
      );
    }
    if (ctx.input.searchRadius !== undefined && ctx.input.searchLatitude === undefined) {
      throw createApiServiceError(
        'Provide searchLatitude and searchLongitude when supplying searchRadius.'
      );
    }

    if (!ctx.input.mapId) {
      let maps = await client.getAllMaps();
      return {
        output: { maps },
        message: `Retrieved **${Array.isArray(maps) ? maps.length : 0}** map(s).`
      };
    }

    if (hasSearchParams) {
      let locations = await client.searchMapLocations(ctx.input.mapId, {
        latitude: ctx.input.searchLatitude,
        longitude: ctx.input.searchLongitude,
        radius: ctx.input.searchRadius,
        query: ctx.input.searchQuery
      });
      return {
        output: { locations },
        message: `Found **${Array.isArray(locations) ? locations.length : 0}** location(s) matching the search criteria.`
      };
    }

    let mapDetails = await client.getMapDetails(ctx.input.mapId);
    return {
      output: { mapDetails },
      message: `Retrieved details for map **${ctx.input.mapId}**.`
    };
  })
  .build();
