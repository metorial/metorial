import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let activityWebhook = SlateTrigger.create(spec, {
  name: 'Activity Feed Webhook',
  key: 'activity_feed_webhook',
  description:
    'Receives real-time activity notifications via the Route4Me Activity Feed webhook. Covers all activity types: route optimization, stop changes, driver arrivals, geofence events, notes, member changes, avoidance zone changes, and user messages. Configure the webhook URL in Route4Me under Integrations > Activity Feed Webhook.'
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
      routeName: z.string().optional().describe('Route name'),
      raw: z.any().optional().describe('Full raw activity payload')
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
  .webhook({
    // Route4Me webhooks are configured manually in the dashboard.
    // No auto-registration is supported.

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Route4Me may send a single activity or an array
      let activities = Array.isArray(data) ? data : [data];

      let inputs = activities
        .filter((a: any) => a && (a.activity_id || a.activity_type))
        .map((a: any) => ({
          activityId:
            a.activity_id || `${a.activity_type}-${a.activity_timestamp || Date.now()}`,
          activityType: a.activity_type || 'unknown',
          activityMessage: a.activity_message,
          activityTimestamp: a.activity_timestamp,
          routeId: a.route_id,
          routeDestinationId: a.route_destination_id,
          memberId: a.member_id,
          routeName: a.route_name,
          raw: a
        }));

      return { inputs };
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
