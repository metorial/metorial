import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

let waypointInputSchema = z.object({
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp of the GPS point'),
  bearing: z.number().optional().describe('Compass direction in degrees (0-360)')
});

export let mapMatch = SlateTool.create(spec, {
  name: 'Map Match',
  key: 'map_match',
  description: `Snap GPS coordinates to the nearest road network. Takes a sequence of GPS points (e.g. from a vehicle tracker) and returns the reconstructed route geometry snapped to actual roads. Also provides road segment details like speed limits, surface type, and road class.`,
  constraints: ['Maximum 1000 location points per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum([
          'drive',
          'light_truck',
          'medium_truck',
          'truck',
          'heavy_truck',
          'truck_dangerous_goods',
          'long_truck',
          'bus',
          'scooter',
          'motorcycle',
          'bicycle',
          'mountain_bike',
          'road_bike',
          'walk',
          'hike'
        ])
        .describe('Travel mode for road matching'),
      waypoints: z
        .array(waypointInputSchema)
        .min(2)
        .describe('GPS points to snap to the road network (at least 2)')
    })
  )
  .output(
    z.object({
      totalDistance: z.number().optional().describe('Total matched route distance in meters'),
      totalTime: z.number().optional().describe('Total matched route time in seconds'),
      matchedWaypoints: z
        .array(
          z.object({
            originalIndex: z
              .number()
              .optional()
              .describe('Index in the original waypoints array'),
            matchedLat: z.number().optional().describe('Snapped latitude'),
            matchedLon: z.number().optional().describe('Snapped longitude'),
            matchType: z.string().optional().describe('Match type'),
            matchDistance: z
              .number()
              .optional()
              .describe('Distance from original point to matched road in meters')
          })
        )
        .optional()
        .describe('Matched waypoints'),
      geometry: z.any().optional().describe('GeoJSON geometry of the matched route')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.mapMatch({
      mode: ctx.input.mode,
      waypoints: ctx.input.waypoints.map(wp => ({
        location: [wp.lon, wp.lat] as [number, number],
        timestamp: wp.timestamp,
        bearing: wp.bearing
      }))
    });

    let feature = data.features?.[0];
    let props = feature?.properties || {};

    let matchedWaypoints = (props.waypoints || []).map((wp: any) => ({
      originalIndex: wp.original_index,
      matchedLat: wp.location?.[1],
      matchedLon: wp.location?.[0],
      matchType: wp.match_type,
      matchDistance: wp.match_distance
    }));

    return {
      output: {
        totalDistance: props.distance,
        totalTime: props.time,
        matchedWaypoints,
        geometry: feature?.geometry
      },
      message: `Map matched **${ctx.input.waypoints.length}** GPS points to road network. Total distance: ${((props.distance || 0) / 1000).toFixed(1)} km.`
    };
  })
  .build();
