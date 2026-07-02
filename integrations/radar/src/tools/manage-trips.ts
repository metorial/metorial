import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let tripSchema = z.object({
  tripId: z.string().describe('Radar internal trip ID'),
  externalId: z.string().optional().describe('External trip ID'),
  status: z
    .string()
    .optional()
    .describe('Trip status: started, approaching, arrived, completed, or canceled'),
  mode: z.string().optional().describe('Travel mode: car, truck, foot, or bike'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom trip metadata'),
  destinationGeofenceTag: z.string().optional().describe('Destination geofence tag'),
  destinationGeofenceExternalId: z
    .string()
    .optional()
    .describe('Destination geofence external ID'),
  destinationLocation: z.any().optional().describe('Destination as GeoJSON Point'),
  etaDuration: z.number().optional().describe('Estimated time to destination in minutes'),
  etaDistance: z.number().optional().describe('Estimated distance to destination in meters'),
  live: z.boolean().optional().describe('Whether the trip is in the live environment'),
  createdAt: z.string().optional().describe('When the trip was created'),
  updatedAt: z.string().optional().describe('When the trip was last updated')
});

export let listTripsTool = SlateTool.create(spec, {
  name: 'List Trips',
  key: 'list_trips',
  description: `List trips in your Radar project. Filter by active/stopped status and destination geofence. Results are sorted by ETA descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'stopped'])
        .optional()
        .describe(
          'Filter by trip status: "active" for ongoing trips, "stopped" for completed/canceled'
        ),
      destinationGeofenceTag: z
        .string()
        .optional()
        .describe('Filter by destination geofence tag'),
      destinationGeofenceExternalId: z
        .string()
        .optional()
        .describe('Filter by destination geofence external ID')
    })
  )
  .output(
    z.object({
      trips: z.array(tripSchema).describe('List of trips')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.listTrips({
      status: ctx.input.status,
      destinationGeofenceTag: ctx.input.destinationGeofenceTag,
      destinationGeofenceExternalId: ctx.input.destinationGeofenceExternalId
    });

    let trips = (result.trips || []).map((t: any) => ({
      tripId: t._id,
      externalId: t.externalId,
      status: t.status,
      mode: t.mode,
      metadata: t.metadata,
      destinationGeofenceTag: t.destinationGeofenceTag,
      destinationGeofenceExternalId: t.destinationGeofenceExternalId,
      destinationLocation: t.destinationLocation,
      etaDuration: t.eta?.duration,
      etaDistance: t.eta?.distance,
      live: t.live,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { trips },
      message: `Found **${trips.length}** trip(s).`
    };
  })
  .build();

export let getTripTool = SlateTool.create(spec, {
  name: 'Get Trip',
  key: 'get_trip',
  description: `Retrieve a specific trip by its Radar ID. Returns full trip details including status, destination, ETA, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tripId: z.string().describe('Radar internal trip ID')
    })
  )
  .output(tripSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.getTrip(ctx.input.tripId);
    let t = result.trip;

    return {
      output: {
        tripId: t._id,
        externalId: t.externalId,
        status: t.status,
        mode: t.mode,
        metadata: t.metadata,
        destinationGeofenceTag: t.destinationGeofenceTag,
        destinationGeofenceExternalId: t.destinationGeofenceExternalId,
        destinationLocation: t.destinationLocation,
        etaDuration: t.eta?.duration,
        etaDistance: t.eta?.distance,
        live: t.live,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Retrieved trip **${t._id}** (status: ${t.status}).`
    };
  })
  .build();

export let updateTripTool = SlateTool.create(spec, {
  name: 'Update Trip',
  key: 'update_trip',
  description: `Update a trip's status or metadata. Use this to progress a trip through its lifecycle (started → approaching → arrived → completed) or to cancel it.`,
  constraints: ['Rate limited to 10 requests per second.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tripId: z.string().describe('Radar internal trip ID'),
      status: z
        .enum(['started', 'approaching', 'arrived', 'completed', 'canceled'])
        .describe('New trip status'),
      metadata: z.record(z.string(), z.string()).optional().describe('Updated custom metadata')
    })
  )
  .output(tripSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.updateTrip(ctx.input.tripId, {
      status: ctx.input.status,
      metadata: ctx.input.metadata
    });
    let t = result.trip;

    return {
      output: {
        tripId: t._id,
        externalId: t.externalId,
        status: t.status,
        mode: t.mode,
        metadata: t.metadata,
        destinationGeofenceTag: t.destinationGeofenceTag,
        destinationGeofenceExternalId: t.destinationGeofenceExternalId,
        destinationLocation: t.destinationLocation,
        etaDuration: t.eta?.duration,
        etaDistance: t.eta?.distance,
        live: t.live,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Trip **${t._id}** updated to status **${t.status}**.`
    };
  })
  .build();
