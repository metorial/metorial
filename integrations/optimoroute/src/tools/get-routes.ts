import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let stopSchema = z.object({
  stopNumber: z.number().optional(),
  orderNo: z.string().optional(),
  orderId: z.string().optional(),
  locationNo: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  scheduledAt: z.string().optional().describe('Scheduled time (HH:MM)'),
  scheduledAtDt: z.string().optional().describe('Scheduled datetime (YYYY-MM-DD HH:MM:SS)'),
  arrivalTimeDt: z.string().optional().describe('Arrival datetime'),
  travelTime: z.number().optional().describe('Travel time from previous stop in seconds'),
  distance: z.number().optional().describe('Distance from previous stop in meters'),
  type: z.string().optional().describe('Stop type (break, depot) if not a regular order stop')
});

let routeSchema = z.object({
  driverExternalId: z.string().optional(),
  driverSerial: z.string().optional(),
  driverName: z.string().optional(),
  vehicleRegistration: z.string().optional(),
  vehicleLabel: z.string().optional(),
  duration: z.number().optional().describe('Total route duration in minutes'),
  distance: z.number().optional().describe('Total route distance in km'),
  load1: z.number().optional(),
  load2: z.number().optional(),
  load3: z.number().optional(),
  load4: z.number().optional(),
  stops: z.array(stopSchema).describe('Ordered list of stops'),
  routePolyline: z.string().optional().describe('Encoded polyline for map display')
});

export let getRoutes = SlateTool.create(spec, {
  name: 'Get Routes',
  key: 'get_routes',
  description: `Retrieve planned routes for a specific date. Returns an ordered list of stops per driver route with scheduled times, travel details, and distances. Optionally filter by driver or vehicle, and include route polylines for map rendering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z.string().describe('Route date (YYYY-MM-DD)'),
      driverExternalId: z.string().optional().describe('Filter by driver external ID'),
      driverSerial: z.string().optional().describe('Filter by driver serial number'),
      vehicleRegistration: z.string().optional().describe('Filter by vehicle registration'),
      includeRoutePolyline: z
        .boolean()
        .optional()
        .describe('Include encoded polyline for each route'),
      includeRouteStartEnd: z
        .boolean()
        .optional()
        .describe('Include route start/end locations')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      routes: z.array(routeSchema),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, unknown> = {
      date: ctx.input.date
    };

    if (ctx.input.driverExternalId) params.driverExternalId = ctx.input.driverExternalId;
    if (ctx.input.driverSerial) params.driverSerial = ctx.input.driverSerial;
    if (ctx.input.vehicleRegistration)
      params.vehicleRegistration = ctx.input.vehicleRegistration;
    if (ctx.input.includeRoutePolyline !== undefined)
      params.includeRoutePolyline = ctx.input.includeRoutePolyline;
    if (ctx.input.includeRouteStartEnd !== undefined)
      params.includeRouteStartEnd = ctx.input.includeRouteStartEnd;

    let result = await client.getRoutes(params);

    let routes = (result.routes || []).map((r: Record<string, unknown>) => ({
      driverExternalId: r.driverExternalId,
      driverSerial: r.driverSerial,
      driverName: r.driverName,
      vehicleRegistration: r.vehicleRegistration,
      vehicleLabel: r.vehicleLabel,
      duration: r.duration,
      distance: r.distance,
      load1: r.load1,
      load2: r.load2,
      load3: r.load3,
      load4: r.load4,
      stops: r.stops || [],
      routePolyline: r.routePolyline
    }));

    let totalStops = routes.reduce(
      (sum: number, r: { stops: unknown[] }) => sum + r.stops.length,
      0
    );

    return {
      output: {
        success: result.success,
        routes,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Retrieved **${routes.length}** routes with **${totalStops}** total stops for ${ctx.input.date}.`
        : `Failed to get routes: ${result.message || result.code}`
    };
  })
  .build();
