import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let asteroidSummarySchema = z.object({
  asteroidId: z.string().describe('NASA/JPL asteroid identifier'),
  neoReferenceId: z.string().describe('Near-Earth Object reference ID'),
  name: z.string().describe('Name of the asteroid'),
  absoluteMagnitude: z.number().optional().describe('Absolute magnitude (H)'),
  estimatedDiameterMinKm: z
    .number()
    .optional()
    .describe('Estimated minimum diameter in kilometers'),
  estimatedDiameterMaxKm: z
    .number()
    .optional()
    .describe('Estimated maximum diameter in kilometers'),
  isPotentiallyHazardous: z
    .boolean()
    .describe('Whether the asteroid is classified as potentially hazardous'),
  closeApproachDate: z.string().optional().describe('Date of closest approach (YYYY-MM-DD)'),
  missDistanceKm: z.string().optional().describe('Miss distance in kilometers'),
  relativeVelocityKmPerSec: z.string().optional().describe('Relative velocity in km/s'),
  nasaJplUrl: z.string().optional().describe('URL to NASA JPL page for this asteroid')
});

export let searchAsteroids = SlateTool.create(spec, {
  name: 'Search Near-Earth Asteroids',
  key: 'search_asteroids',
  description: `Search for near-Earth asteroids (NEOs) using NASA's NeoWs service. Find asteroids by close approach date range, browse the full catalog, or look up a specific asteroid by its SPK-ID. Returns orbital data, size estimates, and hazard classification.`,
  constraints: ['Date range feed lookups are limited to 7 days.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date for close approach lookup (YYYY-MM-DD). Required when searching by date range.'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date for close approach lookup (YYYY-MM-DD). Defaults to 7 days after startDate.'
        ),
      asteroidId: z
        .string()
        .optional()
        .describe('SPK-ID of a specific asteroid to look up. Overrides date range search.'),
      browse: z
        .boolean()
        .optional()
        .describe('Set to true to browse the full asteroid catalog (paginated).'),
      page: z.number().optional().describe('Page number for browsing (0-indexed).'),
      size: z.number().optional().describe('Number of results per page when browsing.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total number of asteroids found'),
      asteroids: z.array(asteroidSummarySchema).describe('List of asteroid summaries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    if (ctx.input.asteroidId) {
      let result = await client.getNeoLookup(ctx.input.asteroidId);
      let asteroid = mapAsteroid(result);
      return {
        output: { totalCount: 1, asteroids: [asteroid] },
        message: `Found asteroid **${asteroid.name}** (${asteroid.isPotentiallyHazardous ? '⚠️ potentially hazardous' : 'not hazardous'}).`
      };
    }

    if (ctx.input.browse) {
      let result = await client.getNeoBrowse({ page: ctx.input.page, size: ctx.input.size });
      let asteroids = (result.near_earth_objects || []).map(mapAsteroid);
      return {
        output: { totalCount: result.page?.total_elements, asteroids },
        message: `Browsing NEO catalog: returned ${asteroids.length} asteroids (page ${result.page?.number ?? 0}).`
      };
    }

    let startDate = ctx.input.startDate || new Date().toISOString().split('T')[0]!;
    let result = await client.getNeoFeed({ startDate, endDate: ctx.input.endDate });
    let allAsteroids: any[] = [];
    for (let dateKey of Object.keys(result.near_earth_objects || {})) {
      allAsteroids.push(...result.near_earth_objects[dateKey]);
    }
    let asteroids = allAsteroids.map(mapAsteroid);

    return {
      output: { totalCount: result.element_count, asteroids },
      message: `Found **${result.element_count}** near-Earth asteroids with close approaches in the specified date range.`
    };
  })
  .build();

let mapAsteroid = (neo: any) => {
  let closeApproach = neo.close_approach_data?.[0];
  return {
    asteroidId: String(neo.id),
    neoReferenceId: neo.neo_reference_id || String(neo.id),
    name: neo.name,
    absoluteMagnitude: neo.absolute_magnitude_h,
    estimatedDiameterMinKm: neo.estimated_diameter?.kilometers?.estimated_diameter_min,
    estimatedDiameterMaxKm: neo.estimated_diameter?.kilometers?.estimated_diameter_max,
    isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid ?? false,
    closeApproachDate: closeApproach?.close_approach_date,
    missDistanceKm: closeApproach?.miss_distance?.kilometers,
    relativeVelocityKmPerSec: closeApproach?.relative_velocity?.kilometers_per_second,
    nasaJplUrl: neo.nasa_jpl_url
  };
};
