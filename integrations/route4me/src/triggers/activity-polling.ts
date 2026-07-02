import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityPolling = SlateTrigger.create(spec, {
  name: 'Activity Feed (Polling)',
  key: 'activity_feed_polling',
  description:
    '[Polling fallback] Polls the Route4Me Activity Feed for new activities. Detects route optimization, stop changes, driver arrivals, geofence events, notes, member changes, and more. Use this when webhook configuration is not available.'
})
  .input(
    z.object({
      activityId: z.string().describe('Activity ID'),
      activityType: z.string().describe('Activity type identifier'),
      activityMessage: z.string().optional().describe('Human-readable activity description'),
      activityTimestamp: z.number().optional().describe('Activity timestamp'),
      routeId: z.string().optional().describe('Related route ID'),
      routeDestinationId: z.number().optional().describe('Related destination ID'),
      memberId: z.number().optional().describe('Member who triggered the activity'),
      routeName: z.string().optional().describe('Route name')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('Activity ID'),
      activityType: z.string().describe('Activity type'),
      activityMessage: z.string().optional().describe('Activity description'),
      activityTimestamp: z.number().optional().describe('Activity timestamp'),
      routeId: z.string().optional().describe('Related route ID'),
      routeDestinationId: z.number().optional().describe('Related destination ID'),
      memberId: z.number().optional().describe('Member who triggered the activity'),
      routeName: z.string().optional().describe('Route name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastTimestamp = ctx.state?.lastTimestamp as number | undefined;
      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];

      let options: Record<string, any> = {
        limit: 50
      };
      if (lastTimestamp) {
        options.start = lastTimestamp;
      }

      let result = await client.getActivities(options);
      let items = result.results || (Array.isArray(result) ? result : []);

      // Filter out already-seen activities
      let newItems = items.filter((a: any) => {
        let id = a.activity_id;
        return id && !seenIds.includes(id);
      });

      let newTimestamp = lastTimestamp;
      let newSeenIds = [...seenIds];

      for (let a of newItems) {
        if (a.activity_timestamp && (!newTimestamp || a.activity_timestamp > newTimestamp)) {
          newTimestamp = a.activity_timestamp;
        }
        if (a.activity_id) {
          newSeenIds.push(a.activity_id);
        }
      }

      // Keep only the last 200 seen IDs to prevent unbounded growth
      if (newSeenIds.length > 200) {
        newSeenIds = newSeenIds.slice(-200);
      }

      return {
        inputs: newItems.map((a: any) => ({
          activityId: a.activity_id,
          activityType: a.activity_type || 'unknown',
          activityMessage: a.activity_message,
          activityTimestamp: a.activity_timestamp,
          routeId: a.route_id,
          routeDestinationId: a.route_destination_id,
          memberId: a.member_id,
          routeName: a.route_name
        })),
        updatedState: {
          lastTimestamp: newTimestamp,
          seenIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        'route-optimized': 'route.optimized',
        'route-delete': 'route.deleted',
        'route-owner-changed': 'route.owner_changed',
        'insert-destination': 'destination.inserted',
        'delete-destination': 'destination.deleted',
        'update-destinations': 'destination.updated',
        'move-destination': 'destination.moved',
        'destination-out-sequence': 'destination.out_of_sequence',
        'mark-destination-visited': 'destination.visited',
        'mark-destination-departed': 'destination.departed',
        'driver-arrived-early': 'driver.arrived_early',
        'driver-arrived-on-time': 'driver.arrived_on_time',
        'driver-arrived-late': 'driver.arrived_late',
        'geofence-entered': 'geofence.entered',
        'geofence-left': 'geofence.left',
        'note-insert': 'note.inserted',
        'member-created': 'member.created',
        'member-deleted': 'member.deleted',
        'member-modified': 'member.modified',
        'area-added': 'area.added',
        'area-removed': 'area.removed',
        'area-updated': 'area.updated',
        message: 'user.message'
      };

      let eventType = typeMap[ctx.input.activityType] || `activity.${ctx.input.activityType}`;

      return {
        type: eventType,
        id: ctx.input.activityId,
        output: {
          activityId: ctx.input.activityId,
          activityType: ctx.input.activityType,
          activityMessage: ctx.input.activityMessage,
          activityTimestamp: ctx.input.activityTimestamp,
          routeId: ctx.input.routeId,
          routeDestinationId: ctx.input.routeDestinationId,
          memberId: ctx.input.memberId,
          routeName: ctx.input.routeName
        }
      };
    }
  })
  .build();
