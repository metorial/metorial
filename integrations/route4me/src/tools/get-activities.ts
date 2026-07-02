import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivities = SlateTool.create(spec, {
  name: 'Get Activities',
  key: 'get_activities',
  description: `Retrieve activities from the activity feed. The activity feed is an audit log of all routing-related events: route optimization, stop changes, driver arrivals, geofence events, notes, member changes, and more.
Filter by route, activity type, or time range.`,
  instructions: [
    'Available activity types: route-optimized, route-delete, insert-destination, delete-destination, update-destinations, move-destination, mark-destination-visited, mark-destination-departed, destination-out-sequence, driver-arrived-early, driver-arrived-on-time, driver-arrived-late, geofence-entered, geofence-left, note-insert, member-created, member-deleted, member-modified, area-added, area-removed, area-updated, route-owner-changed, message.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeId: z.string().optional().describe('Filter by route ID'),
      activityType: z
        .string()
        .optional()
        .describe(
          'Filter by activity type (e.g., route-optimized, insert-destination, driver-arrived-late)'
        ),
      limit: z.number().optional().describe('Max number of activities to return'),
      offset: z.number().optional().describe('Pagination offset'),
      startTimestamp: z
        .number()
        .optional()
        .describe('Filter activities after this unix timestamp'),
      endTimestamp: z
        .number()
        .optional()
        .describe('Filter activities before this unix timestamp')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.string().optional().describe('Activity ID'),
            activityType: z.string().optional().describe('Type of activity'),
            activityMessage: z
              .string()
              .optional()
              .describe('Human-readable activity description'),
            activityTimestamp: z.number().optional().describe('Activity timestamp'),
            routeId: z.string().optional().describe('Related route ID'),
            routeDestinationId: z.number().optional().describe('Related destination ID'),
            memberId: z.number().optional().describe('Member who performed the activity'),
            routeName: z.string().optional().describe('Route name')
          })
        )
        .describe('List of activities'),
      total: z.number().optional().describe('Total number of matching activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getActivities({
      routeId: ctx.input.routeId,
      activityType: ctx.input.activityType,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      start: ctx.input.startTimestamp,
      end: ctx.input.endTimestamp
    });

    let items = result.results || (Array.isArray(result) ? result : []);

    return {
      output: {
        activities: items.map((a: any) => ({
          activityId: a.activity_id,
          activityType: a.activity_type,
          activityMessage: a.activity_message,
          activityTimestamp: a.activity_timestamp,
          routeId: a.route_id,
          routeDestinationId: a.route_destination_id,
          memberId: a.member_id,
          routeName: a.route_name
        })),
        total: result.total
      },
      message: `Retrieved ${items.length} activity/activities.`
    };
  })
  .build();
