import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

export let locationEventsTrigger = SlateTrigger.create(spec, {
  name: 'Location Events',
  key: 'location_events',
  description:
    '[Polling fallback] Triggers on Radar location events including geofence entries/exits, place visits, trip lifecycle events, region crossings, and beacon events.'
})
  .input(
    z.object({
      eventId: z.string().describe('Radar event ID'),
      eventType: z.string().describe('Event type (e.g., user.entered_geofence)'),
      createdAt: z.string().optional().describe('When the event was created'),
      confidence: z.number().optional().describe('Event confidence level (1-3)'),
      live: z.boolean().optional().describe('Whether the event is in the live environment'),
      userId: z.string().optional().describe('User ID associated with the event'),
      deviceId: z.string().optional().describe('Device ID associated with the event'),
      userMetadata: z.record(z.string(), z.any()).optional().describe('User metadata'),
      geofence: z.any().optional().describe('Geofence involved in the event'),
      place: z.any().optional().describe('Place involved in the event'),
      region: z.any().optional().describe('Region involved in the event'),
      trip: z.any().optional().describe('Trip involved in the event'),
      beacon: z.any().optional().describe('Beacon involved in the event'),
      location: z.any().optional().describe('Event location as GeoJSON Point'),
      locationAccuracy: z.number().optional().describe('Location accuracy in meters')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Radar event ID'),
      eventType: z.string().describe('Event type'),
      createdAt: z.string().optional().describe('When the event was created'),
      confidence: z.number().optional().describe('Event confidence (1-3)'),
      userId: z.string().optional().describe('User ID'),
      deviceId: z.string().optional().describe('Device ID'),
      latitude: z.number().optional().describe('Event latitude'),
      longitude: z.number().optional().describe('Event longitude'),
      locationAccuracy: z.number().optional().describe('Location accuracy in meters'),
      geofenceTag: z.string().optional().describe('Geofence tag (if geofence event)'),
      geofenceExternalId: z
        .string()
        .optional()
        .describe('Geofence external ID (if geofence event)'),
      geofenceDescription: z
        .string()
        .optional()
        .describe('Geofence description (if geofence event)'),
      geofenceMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Geofence metadata (if geofence event)'),
      placeName: z.string().optional().describe('Place name (if place event)'),
      placeChain: z.string().optional().describe('Place chain name (if place event)'),
      placeCategories: z
        .array(z.string())
        .optional()
        .describe('Place categories (if place event)'),
      tripExternalId: z.string().optional().describe('Trip external ID (if trip event)'),
      tripStatus: z.string().optional().describe('Trip status (if trip event)'),
      tripEtaDuration: z
        .number()
        .optional()
        .describe('Trip ETA duration in minutes (if trip event)'),
      tripEtaDistance: z
        .number()
        .optional()
        .describe('Trip ETA distance in meters (if trip event)'),
      regionCountry: z.string().optional().describe('Country name (if region event)'),
      regionCountryCode: z.string().optional().describe('Country code (if region event)'),
      regionState: z.string().optional().describe('State name (if region event)'),
      regionStateCode: z.string().optional().describe('State code (if region event)'),
      regionDma: z.string().optional().describe('DMA name (if region/DMA event)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new RadarClient({ token: ctx.auth.token });
      let lastCreatedAt = (ctx.state as any)?.lastCreatedAt as string | undefined;

      let params: any = { limit: 100 };
      if (lastCreatedAt) {
        params.createdAfter = lastCreatedAt;
      }

      let result = await client.listEvents(params);
      let events = result.events || [];

      // Events are sorted descending by createdAt, so newest first
      let inputs = events.map((e: any) => ({
        eventId: e._id,
        eventType: e.type,
        createdAt: e.createdAt,
        confidence: e.confidence,
        live: e.live,
        userId: e.user?.userId,
        deviceId: e.user?.deviceId,
        userMetadata: e.user?.metadata,
        geofence: e.geofence,
        place: e.place,
        region: e.region,
        trip: e.trip,
        beacon: e.beacon,
        location: e.location,
        locationAccuracy: e.locationAccuracy
      }));

      let updatedLastCreatedAt = lastCreatedAt;
      if (events.length > 0 && events[0].createdAt) {
        updatedLastCreatedAt = events[0].createdAt;
      }

      return {
        inputs,
        updatedState: {
          lastCreatedAt: updatedLastCreatedAt
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let latitude: number | undefined;
      let longitude: number | undefined;
      if (input.location?.coordinates) {
        longitude = input.location.coordinates[0];
        latitude = input.location.coordinates[1];
      }

      return {
        type: input.eventType,
        id: input.eventId,
        output: {
          eventId: input.eventId,
          eventType: input.eventType,
          createdAt: input.createdAt,
          confidence: input.confidence,
          userId: input.userId,
          deviceId: input.deviceId,
          latitude,
          longitude,
          locationAccuracy: input.locationAccuracy,
          geofenceTag: input.geofence?.tag,
          geofenceExternalId: input.geofence?.externalId,
          geofenceDescription: input.geofence?.description,
          geofenceMetadata: input.geofence?.metadata,
          placeName: input.place?.name,
          placeChain: input.place?.chain?.name,
          placeCategories: input.place?.categories,
          tripExternalId: input.trip?.externalId,
          tripStatus: input.trip?.status,
          tripEtaDuration: input.trip?.eta?.duration,
          tripEtaDistance: input.trip?.eta?.distance,
          regionCountry: input.region?.country?.name,
          regionCountryCode: input.region?.country?.code,
          regionState: input.region?.state?.name,
          regionStateCode: input.region?.state?.code,
          regionDma: input.region?.dma?.name
        }
      };
    }
  })
  .build();
