import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let newGeofence = SlateTrigger.create(spec, {
  name: 'New Geofence',
  key: 'new_geofence',
  description: 'Triggers when a new geofence is created in your Beaconstac account.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      geofenceId: z.number().describe('Geofence ID'),
      name: z.string().describe('Geofence name'),
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      radius: z.number().describe('Radius in meters'),
      placeId: z.number().optional().describe('Associated place ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      geofenceId: z.number().describe('ID of the geofence'),
      name: z.string().describe('Name of the geofence'),
      latitude: z.number().describe('Latitude of center'),
      longitude: z.number().describe('Longitude of center'),
      radius: z.number().describe('Radius in meters'),
      placeId: z.number().optional().describe('Associated place ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BeaconstacClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let result = await client.listGeofences({
        ordering: '-created',
        organization: ctx.config.organizationId,
        limit: 20
      });

      let lastSeenId = (ctx.state as Record<string, unknown>)?.lastSeenId as
        | number
        | undefined;

      let newGeofences = lastSeenId ? result.results.filter(g => g.id > lastSeenId) : [];

      let latestId = result.results.length > 0 ? result.results[0]!.id : lastSeenId;

      return {
        inputs: newGeofences.map(g => ({
          eventType: 'created',
          geofenceId: g.id,
          name: g.name,
          latitude: g.latitude,
          longitude: g.longitude,
          radius: g.radius,
          placeId: g.place,
          createdAt: g.created
        })),
        updatedState: {
          lastSeenId: latestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'geofence.created',
        id: String(ctx.input.geofenceId),
        output: {
          geofenceId: ctx.input.geofenceId,
          name: ctx.input.name,
          latitude: ctx.input.latitude,
          longitude: ctx.input.longitude,
          radius: ctx.input.radius,
          placeId: ctx.input.placeId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
