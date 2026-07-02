import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRoutes = SlateTool.create(spec, {
  name: 'List Routes',
  key: 'list_routes',
  description: `List the authenticated athlete's routes with pagination. Returns route summaries including name, distance, elevation gain, and type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Number of routes per page (default 30)')
    })
  )
  .output(
    z.object({
      routes: z
        .array(
          z.object({
            routeId: z.number().describe('Route identifier'),
            name: z.string().describe('Route name'),
            description: z.string().nullable().optional().describe('Route description'),
            distance: z.number().describe('Distance in meters'),
            elevationGain: z.number().describe('Elevation gain in meters'),
            type: z.number().optional().describe('Route type (1=ride, 2=run)'),
            starred: z.boolean().optional().describe('Whether the route is starred')
          })
        )
        .describe('List of routes'),
      count: z.number().describe('Number of routes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let athlete = await client.getAuthenticatedAthlete();
    let routes = await client.listAthleteRoutes(athlete.id, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = routes.map((r: any) => ({
      routeId: r.id,
      name: r.name,
      description: r.description,
      distance: r.distance,
      elevationGain: r.elevation_gain,
      type: r.type,
      starred: r.starred
    }));

    return {
      output: {
        routes: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** routes.`
    };
  })
  .build();
