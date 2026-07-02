import { SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Radar event ID'),
  type: z.string().describe('Event type (e.g., user.entered_geofence)'),
  createdAt: z.string().optional().describe('When the event was created'),
  live: z.boolean().optional().describe('Whether the event is in the live environment'),
  confidence: z.number().optional().describe('Event confidence level (1-3)'),
  userId: z.string().optional().describe('User ID associated with the event'),
  deviceId: z.string().optional().describe('Device ID associated with the event'),
  geofence: z.any().optional().describe('Geofence involved in the event'),
  place: z.any().optional().describe('Place involved in the event'),
  region: z.any().optional().describe('Region involved in the event'),
  trip: z.any().optional().describe('Trip involved in the event'),
  location: z.any().optional().describe('Location as GeoJSON Point'),
  locationAccuracy: z.number().optional().describe('Location accuracy in meters')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List location events in your Radar project. Includes geofence entries/exits, place visits, trip events, and region crossings. Results are sorted by creation date descending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max events to return (default 100)'),
      createdBefore: z.string().optional().describe('ISO 8601 datetime cursor for pagination'),
      createdAfter: z.string().optional().describe('ISO 8601 datetime cursor')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema).describe('List of events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.listEvents({
      limit: ctx.input.limit,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter
    });

    let events = (result.events || []).map((e: any) => ({
      eventId: e._id,
      type: e.type,
      createdAt: e.createdAt,
      live: e.live,
      confidence: e.confidence,
      userId: e.user?.userId,
      deviceId: e.user?.deviceId,
      geofence: e.geofence,
      place: e.place,
      region: e.region,
      trip: e.trip,
      location: e.location,
      locationAccuracy: e.locationAccuracy
    }));

    return {
      output: { events },
      message: `Found **${events.length}** event(s).`
    };
  })
  .build();

export let getEventTool = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve a specific event by its Radar ID. Returns full event details including type, confidence, user, geofence/place/region context, and location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Radar event ID')
    })
  )
  .output(eventSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.getEvent(ctx.input.eventId);
    let e = result.event;

    return {
      output: {
        eventId: e._id,
        type: e.type,
        createdAt: e.createdAt,
        live: e.live,
        confidence: e.confidence,
        userId: e.user?.userId,
        deviceId: e.user?.deviceId,
        geofence: e.geofence,
        place: e.place,
        region: e.region,
        trip: e.trip,
        location: e.location,
        locationAccuracy: e.locationAccuracy
      },
      message: `Retrieved event **${e._id}** (type: ${e.type}).`
    };
  })
  .build();

export let verifyEventTool = SlateTool.create(spec, {
  name: 'Verify Event',
  key: 'verify_event',
  description: `Accept, reject, or unverify a Radar event. Useful for training Radar's confidence model by confirming or denying whether an event actually occurred.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('Radar event ID to verify'),
      verification: z
        .enum(['accept', 'reject', 'unverify'])
        .describe('Verification action: accept (1), reject (-1), or unverify (0)'),
      verifiedPlaceId: z
        .string()
        .optional()
        .describe('Correct place ID if rejecting a place event')
    })
  )
  .output(eventSchema)
  .handleInvocation(async ctx => {
    let client = new RadarClient({ token: ctx.auth.token });
    let verificationMap: Record<string, number> = {
      accept: 1,
      reject: -1,
      unverify: 0
    };

    let result = await client.verifyEvent(ctx.input.eventId, {
      verification: verificationMap[ctx.input.verification]!,
      verifiedPlaceId: ctx.input.verifiedPlaceId
    });
    let e = result.event;

    return {
      output: {
        eventId: e._id,
        type: e.type,
        createdAt: e.createdAt,
        live: e.live,
        confidence: e.confidence,
        userId: e.user?.userId,
        deviceId: e.user?.deviceId,
        geofence: e.geofence,
        place: e.place,
        region: e.region,
        trip: e.trip,
        location: e.location,
        locationAccuracy: e.locationAccuracy
      },
      message: `Event **${e._id}** marked as **${ctx.input.verification}**.`
    };
  })
  .build();
