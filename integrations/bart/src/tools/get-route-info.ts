import { SlateTool } from 'slates';
import { z } from 'zod';
import { BartClient } from '../lib/client';
import { bartRecord, bartRecords, bartStrings, bartText } from '../lib/response';
import { spec } from '../spec';

let routeSummarySchema = z.object({
  routeName: z.string().describe('Route name'),
  routeAbbr: z.string().describe('Route abbreviation'),
  routeId: z.string().describe('Route identifier (e.g., "ROUTE 3")'),
  routeNumber: z.string().describe('Route number'),
  color: z.string().describe('Provider line color value (may be a hex code)'),
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
    'Call this tool without routeNumber to discover route numbers, including airport connector routes. Use "all" for all route details.',
    'The date filter requires routeNumber (or "all" for all route details). Omit date when discovering current routes.'
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
        .describe(
          'Route number from the route list or "all". Omit to list routes with basic info.'
        ),
      date: z
        .string()
        .optional()
        .describe(
          'Schedule date in "mm/dd/yyyy" format, "today", or "now". Requires routeNumber; date-filtered route discovery is unsupported.'
        )
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
    let result = ctx.input.routeNumber
      ? await client.getRouteInfo(ctx.input.routeNumber, ctx.input.date)
      : await client.getRoutes(ctx.input.date);
    let routes = bartRecords(bartRecord(result.routes).route);
    let mapSummary = (r: Record<string, unknown>) => ({
      routeName: bartText(r.name),
      routeAbbr: bartText(r.abbr),
      routeId: bartText(r.routeID),
      routeNumber: bartText(r.number),
      color: bartText(r.color),
      hexcolor: bartText(r.hexcolor),
      direction: bartText(r.direction)
    });
    if (!ctx.input.routeNumber) {
      return {
        output: { routes: routes.map(mapSummary) },
        message: `Retrieved **${routes.length}** BART routes.`
      };
    }
    let routeDetails = routes.map(r => {
      let stations = bartStrings(bartRecord(r.config).station);
      return {
        ...mapSummary(r),
        origin: bartText(r.origin),
        destination: bartText(r.destination),
        stationCount: bartText(r.num_stns) || String(stations.length),
        stations
      };
    });
    return {
      output: { routeDetails },
      message: `Retrieved details for **${routeDetails.length}** route(s).`
    };
  })
  .build();
