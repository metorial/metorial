import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { spec } from '../spec';

let routeSummarySchema = z.object({
  routeName: z.string().describe('Route name'),
  routeAbbr: z.string().describe('Route abbreviation'),
  routeId: z.string().describe('Route identifier (e.g., "ROUTE 3")'),
  routeNumber: z.string().describe('Route number'),
  color: z.string().describe('Line color name'),
  hexcolor: z.string().describe('Line color hex code'),
  direction: z.string().describe('Route direction')
});

let routeDetailSchema = routeSummarySchema.extend({
  origin: z.string().describe('Origin station abbreviation'),
  destination: z.string().describe('Destination station abbreviation'),
  stationCount: z.string().describe('Number of stations on this route'),
  stations: z
    .array(z.string())
    .describe('Ordered list of station abbreviation codes on this route')
});

export let getRouteInfo = SlateTool.create(spec, {
  name: 'Get Route Info',
  key: 'get_route_info',
  description: `Retrieve information about BART routes. Can list all active routes or get detailed information about a specific route including the ordered list of stations it serves, origin/destination, color, and direction.`,
  instructions: [
    'Route numbers range from 1-12. Use "all" to get details for all routes.',
    'Optionally specify a date to see routes for a particular schedule.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeNumber: z
        .string()
        .optional()
        .describe('Route number (1-12) or "all". Omit to list all routes with basic info.'),
      date: z
        .string()
        .optional()
        .describe('Schedule date in "mm/dd/yyyy" format, "today", or "now"')
    })
  )
  .output(
    z.object({
      routes: z
        .array(routeSummarySchema)
        .optional()
        .describe('List of routes (returned when listing all routes)'),
      routeDetails: z
        .array(routeDetailSchema)
        .optional()
        .describe(
          'Detailed route info with station list (returned when a specific route is requested)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BartClient({ token: ctx.auth.token });

    if (!ctx.input.routeNumber) {
      let result = await client.getRoutes(ctx.input.date);
      let routeData = result?.routes?.route;
      let routes = Array.isArray(routeData) ? routeData : routeData ? [routeData] : [];

      let mappedRoutes = routes.map((r: any) => ({
        routeName: r.name || '',
        routeAbbr: r.abbr || '',
        routeId: r.routeID || '',
        routeNumber: r.number || '',
        color: r.color || '',
        hexcolor: r.hexcolor || '',
        direction: r.direction || ''
      }));

      return {
        output: { routes: mappedRoutes },
        message: `Retrieved **${mappedRoutes.length}** BART routes.`
      };
    }

    let result = await client.getRouteInfo(ctx.input.routeNumber, ctx.input.date);
    let routeData = result?.routes?.route;
    let routes = Array.isArray(routeData) ? routeData : routeData ? [routeData] : [];

    let mappedRoutes = routes.map((r: any) => {
      let stationData = r.config?.station;
      let stations = Array.isArray(stationData)
        ? stationData
        : stationData
          ? [stationData]
          : [];

      return {
        routeName: r.name || '',
        routeAbbr: r.abbr || '',
        routeId: r.routeID || '',
        routeNumber: r.number || '',
        color: r.color || '',
        hexcolor: r.hexcolor || '',
        direction: r.direction || '',
        origin: r.origin || '',
        destination: r.destination || '',
        stationCount: r.num_stns || String(stations.length),
        stations
      };
    });

    return {
      output: { routeDetails: mappedRoutes },
      message: `Retrieved details for **${mappedRoutes.length}** route(s).`
    };
  })
  .build();
