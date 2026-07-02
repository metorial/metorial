import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let boundarySchema = z.object({
  placeId: z.string().optional().describe('Boundary place identifier'),
  name: z.string().optional().describe('Boundary name'),
  adminLevel: z.number().optional().describe('Administrative level'),
  resultType: z.string().optional().describe('Boundary type (country, state, city, etc.)'),
  country: z.string().optional().describe('Country name'),
  countryCode: z.string().optional().describe('ISO country code'),
  state: z.string().optional().describe('State name'),
  city: z.string().optional().describe('City name'),
  geometry: z.any().optional().describe('GeoJSON boundary polygon geometry')
});

export let lookupBoundaries = SlateTool.create(spec, {
  name: 'Lookup Boundaries',
  key: 'lookup_boundaries',
  description: `Look up administrative boundaries for a location. Two modes: **"part_of"** returns all boundaries containing a location (city → county → state → country), **"consists_of"** returns child boundaries within a location (country → states, city → districts). Returns GeoJSON boundary polygons.`,
  instructions: [
    'For "part_of": provide a placeId or lat/lon to find which boundaries contain that location.',
    'For "consists_of": provide a placeId to find sub-divisions (e.g. states within a country).',
    'Set geometry to "geometry_1000" to include simplified polygon boundaries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      direction: z
        .enum(['part_of', 'consists_of'])
        .describe(
          '"part_of" to find containing boundaries, "consists_of" to find sub-boundaries'
        ),
      placeId: z.string().optional().describe('Place ID from geocoding results'),
      lat: z
        .number()
        .optional()
        .describe('Latitude (for part_of only, alternative to placeId)'),
      lon: z
        .number()
        .optional()
        .describe('Longitude (for part_of only, alternative to placeId)'),
      geometry: z
        .string()
        .optional()
        .describe('Geometry detail level (e.g. "geometry_1000" for simplified polygons)'),
      level: z.string().optional().describe('Subdivision level to retrieve (for consists_of)')
    })
  )
  .output(
    z.object({
      boundaries: z.array(boundarySchema).describe('Administrative boundaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.direction === 'part_of') {
      data = await client.getBoundariesPartOf({
        placeId: ctx.input.placeId,
        lat: ctx.input.lat,
        lon: ctx.input.lon,
        geometry: ctx.input.geometry
      });
    } else {
      data = await client.getBoundariesConsistsOf({
        placeId: ctx.input.placeId!,
        geometry: ctx.input.geometry,
        level: ctx.input.level
      });
    }

    let boundaries = (data.features || []).map((f: any) => {
      let p = f.properties || {};
      return {
        placeId: p.place_id,
        name: p.name,
        adminLevel: p.admin_level,
        resultType: p.result_type,
        country: p.country,
        countryCode: p.country_code,
        state: p.state,
        city: p.city,
        geometry: f.geometry
      };
    });

    return {
      output: { boundaries },
      message: `Found **${boundaries.length}** boundary(ies) (${ctx.input.direction}) for the specified location.`
    };
  })
  .build();
