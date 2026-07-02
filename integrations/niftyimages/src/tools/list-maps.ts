import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMaps = SlateTool.create(spec, {
  name: 'List Maps',
  key: 'list_maps',
  description: `Retrieve all maps in your NiftyImages account, or get details and search locations for a specific map. Useful for finding map IDs before managing locations.`,
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
          'If provided, retrieves detailed information for this specific map. Otherwise lists all maps.'
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
        .describe('Search radius for nearest-location detection (requires mapId).'),
      searchQuery: z
        .string()
        .optional()
        .describe('Search query to find locations by name or address (requires mapId).')
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

    if (!ctx.input.mapId) {
      let maps = await client.getAllMaps();
      return {
        output: { maps },
        message: `Retrieved **${Array.isArray(maps) ? maps.length : 0}** map(s).`
      };
    }

    let hasSearchParams =
      ctx.input.searchLatitude !== undefined ||
      ctx.input.searchLongitude !== undefined ||
      ctx.input.searchQuery !== undefined;

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
