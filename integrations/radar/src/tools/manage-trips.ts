import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let tripSchema = z.object({
  tripId: z.string().describe('Radar internal trip ID'),
  externalId: z.string().optional().describe('External trip ID'),
  status: z
    .string()
    .optional()
    .describe(
      'Trip status, including pending, started, approaching, arrived, completed, canceled, or expired'
    ),
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
  description: `List trips in your Radar project. Filter by status and destination geofence, and paginate by creation time. Results are sorted by last update time descending by default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'active',
          'stopped',
          'pending',
          'started',
          'approaching',
          'arrived',
          'completed',
          'canceled',
          'expired'
        ])
        .optional()
        .describe(
          'Filter by a trip status. Legacy active selects pending/started/approaching/arrived; stopped selects completed/canceled/expired.'
        ),
      destinationGeofenceTag: z
        .string()
        .optional()
        .describe('Filter by destination geofence tag'),
      destinationGeofenceExternalId: z
        .string()
        .optional()
        .describe('Filter by destination geofence external ID'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum trips to return (default 500)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Return trips created before this ISO 8601 timestamp'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return trips created after this ISO 8601 timestamp'),
      sortBy: z
        .enum(['createdAt', 'updatedAt'])
        .optional()
        .describe('Sort field, descending (default updatedAt)')
    })
  )
  .output(
    z.object({
      trips: z.array(tripSchema).describe('List of trips')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let legacyStatuses: Record<string, string> = {
      active: 'pending,started,approaching,arrived',
      stopped: 'completed,canceled,expired'
    };
    let result = await client.listTrips({
      status: ctx.input.status
        ? (legacyStatuses[ctx.input.status] ?? ctx.input.status)
        : undefined,
      destinationGeofenceTag: ctx.input.destinationGeofenceTag,
      destinationGeofenceExternalId: ctx.input.destinationGeofenceExternalId,
      limit: ctx.input.limit,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter,
      sortBy: ctx.input.sortBy
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
        .enum(['started', 'approaching', 'arrived', 'completed', 'canceled', 'pending'])
        .describe('New trip status'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom metadata'),
      mode: z.enum(['car', 'foot', 'bike']).optional().describe('Travel mode'),
      destinationGeofenceTag: z.string().optional().describe('Destination geofence tag'),
      destinationGeofenceExternalId: z
        .string()
        .optional()
        .describe('Destination geofence external ID'),
      approachingThreshold: z
        .number()
        .positive()
        .optional()
        .describe('Approaching threshold in minutes'),
      scheduledArrivalAt: z
        .string()
        .optional()
        .describe('Scheduled arrival ISO 8601 timestamp')
    })
  )
  .output(tripSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.updateTrip(ctx.input.tripId, {
      status: ctx.input.status,
      metadata: ctx.input.metadata,
      mode: ctx.input.mode,
      destinationGeofenceTag: ctx.input.destinationGeofenceTag,
      destinationGeofenceExternalId: ctx.input.destinationGeofenceExternalId,
      approachingThreshold: ctx.input.approachingThreshold,
      scheduledArrivalAt: ctx.input.scheduledArrivalAt
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

export let createTripTool = SlateTool.create(spec, {
  name: 'Create Trip',
  key: 'create_trip',
  description:
    'Create a Radar trip with a stable external ID, optional user, and destination geofence. Subsequent location updates for the user update the trip.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      externalId: z
        .string()
        .min(1)
        .describe('Stable unique trip ID, such as an order or delivery ID'),
      userId: z.string().optional().describe('External user ID to associate with the trip'),
      destinationGeofenceTag: z
        .string()
        .optional()
        .describe('Destination geofence tag; provide with destinationGeofenceExternalId'),
      destinationGeofenceExternalId: z
        .string()
        .optional()
        .describe('Destination geofence external ID; provide with destinationGeofenceTag'),
      mode: z.enum(['car', 'foot', 'bike']).optional().describe('Travel mode (default car)'),
      approachingThreshold: z
        .number()
        .positive()
        .optional()
        .describe('Approaching threshold in minutes'),
      scheduledArrivalAt: z
        .string()
        .optional()
        .describe('Scheduled arrival ISO 8601 timestamp, required for Olo order firing'),
      metadata: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Custom trip metadata')
    })
  )
  .output(
    tripSchema.extend({
      userId: z.string().optional().describe('External user ID associated with the trip')
    })
  )
  .handleInvocation(async ctx => {
    if (
      Boolean(ctx.input.destinationGeofenceTag) !==
      Boolean(ctx.input.destinationGeofenceExternalId)
    ) {
      throw createApiServiceError(
        'Provide both destinationGeofenceTag and destinationGeofenceExternalId, or omit both.'
      );
    }
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.createTrip(ctx.input);
    let t = result.trip;
    if (!t?._id) {
      throw createApiServiceError('Radar did not return a trip ID after creating the trip.');
    }
    return {
      output: {
        tripId: t._id,
        externalId: t.externalId ?? undefined,
        userId: t.userId ?? undefined,
        status: t.status ?? undefined,
        mode: t.mode ?? undefined,
        metadata: t.metadata ?? undefined,
        destinationGeofenceTag: t.destinationGeofenceTag ?? undefined,
        destinationGeofenceExternalId: t.destinationGeofenceExternalId ?? undefined,
        destinationLocation: t.destinationLocation ?? undefined,
        etaDuration: t.eta?.duration ?? undefined,
        etaDistance: t.eta?.distance ?? undefined,
        live: t.live ?? undefined,
        createdAt: t.createdAt ?? undefined,
        updatedAt: t.updatedAt ?? undefined
      },
      message: `Created trip **${t._id}** for external ID **${ctx.input.externalId}**.`
    };
  })
  .build();

export let deleteTripTool = SlateTool.create(spec, {
  name: 'Delete Trip',
  key: 'delete_trip',
  description: 'Permanently delete a Radar trip by its internal or external ID.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      tripId: z.string().min(1).describe('Radar internal trip ID or external trip ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether Radar confirmed the deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    await client.deleteTrip(ctx.input.tripId);
    return {
      output: { success: true },
      message: `Deleted trip **${ctx.input.tripId}**.`
    };
  })
  .build();
