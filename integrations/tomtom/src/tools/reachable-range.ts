import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let reachableRange = SlateTool.create(spec, {
  name: 'Reachable Range',
  key: 'reachable_range',
  description: `Calculate the area reachable from a given origin within a specified budget (time, distance, fuel, or energy). Returns a polygon boundary representing the reachable area, useful for isochrone/isodistance maps and EV range estimation.`,
  instructions: [
    'Exactly one budget type must be provided: timeBudgetInSec, distanceBudgetInMeters, fuelBudgetInLiters, or energyBudgetInkWh',
    'Use energyBudgetInkWh with vehicleEngineType "electric" for EV range calculations'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      originLat: z.number().describe('Origin latitude'),
      originLon: z.number().describe('Origin longitude'),
      timeBudgetInSec: z.number().optional().describe('Time budget in seconds'),
      distanceBudgetInMeters: z.number().optional().describe('Distance budget in meters'),
      fuelBudgetInLiters: z.number().optional().describe('Fuel budget in liters (combustion)'),
      energyBudgetInkWh: z.number().optional().describe('Energy budget in kWh (electric)'),
      routeType: z
        .enum(['fastest', 'shortest', 'eco'])
        .optional()
        .describe('Route optimization type'),
      travelMode: z
        .enum(['car', 'truck', 'taxi', 'bus', 'van', 'motorcycle', 'bicycle', 'pedestrian'])
        .optional()
        .describe('Travel mode'),
      traffic: z.boolean().optional().describe('Consider real-time traffic'),
      vehicleEngineType: z
        .enum(['combustion', 'electric'])
        .optional()
        .describe('Vehicle engine type'),
      vehicleMaxSpeed: z.number().optional().describe('Maximum vehicle speed in km/h'),
      avoid: z
        .array(z.enum(['tollRoads', 'motorways', 'ferries', 'unpavedRoads']))
        .optional()
        .describe('Road types to avoid')
    })
  )
  .output(
    z.object({
      center: z
        .object({
          lat: z.number().describe('Center latitude (map-matched origin)'),
          lon: z.number().describe('Center longitude (map-matched origin)')
        })
        .describe('Center of the reachable area'),
      boundary: z
        .array(
          z.object({
            lat: z.number().describe('Boundary point latitude'),
            lon: z.number().describe('Boundary point longitude')
          })
        )
        .describe('Polygon boundary of the reachable area')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.calculateReachableRange({
      originLat: ctx.input.originLat,
      originLon: ctx.input.originLon,
      timeBudgetInSec: ctx.input.timeBudgetInSec,
      distanceBudgetInMeters: ctx.input.distanceBudgetInMeters,
      fuelBudgetInLiters: ctx.input.fuelBudgetInLiters,
      energyBudgetInkWh: ctx.input.energyBudgetInkWh,
      routeType: ctx.input.routeType,
      travelMode: ctx.input.travelMode,
      traffic: ctx.input.traffic,
      vehicleEngineType: ctx.input.vehicleEngineType,
      vehicleMaxSpeed: ctx.input.vehicleMaxSpeed,
      avoid: ctx.input.avoid
    });

    let range = data.reachableRange || {};
    let center = {
      lat: range.center?.latitude || ctx.input.originLat,
      lon: range.center?.longitude || ctx.input.originLon
    };
    let boundary = (range.boundary || []).map((p: any) => ({
      lat: p.latitude,
      lon: p.longitude
    }));

    return {
      output: { center, boundary },
      message: `Calculated reachable range with **${boundary.length}** boundary points from (${ctx.input.originLat}, ${ctx.input.originLon}).`
    };
  })
  .build();
