import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActivities = SlateTool.create(spec, {
  name: 'List Activities',
  key: 'list_activities',
  description: `List the authenticated athlete's activities. Supports filtering by date range and pagination. Returns summary-level activity data including sport type, distance, duration, and elevation.`,
  constraints: ['Maximum 200 activities per page', 'Results are sorted newest first'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      before: z
        .string()
        .optional()
        .describe('Only return activities before this ISO 8601 date'),
      after: z.string().optional().describe('Only return activities after this ISO 8601 date'),
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of activities per page (default 30, max 200)')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.number().describe('Activity identifier'),
            name: z.string().describe('Activity name'),
            sportType: z.string().describe('Sport type (Run, Ride, Swim, etc.)'),
            startDate: z.string().describe('Activity start date in UTC'),
            startDateLocal: z.string().describe('Activity start date in local time'),
            timezone: z.string().nullable().optional().describe('Timezone of the activity'),
            distance: z.number().describe('Distance in meters'),
            movingTime: z.number().describe('Moving time in seconds'),
            elapsedTime: z.number().describe('Elapsed time in seconds'),
            totalElevationGain: z.number().describe('Total elevation gain in meters'),
            averageSpeed: z
              .number()
              .nullable()
              .optional()
              .describe('Average speed in meters/second'),
            maxSpeed: z.number().nullable().optional().describe('Max speed in meters/second'),
            averageHeartrate: z
              .number()
              .nullable()
              .optional()
              .describe('Average heart rate in bpm'),
            maxHeartrate: z.number().nullable().optional().describe('Max heart rate in bpm'),
            kudosCount: z.number().optional().describe('Number of kudos'),
            commentCount: z.number().optional().describe('Number of comments')
          })
        )
        .describe('List of activities'),
      count: z.number().describe('Number of activities returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let beforeEpoch = ctx.input.before
      ? Math.floor(new Date(ctx.input.before).getTime() / 1000)
      : undefined;
    let afterEpoch = ctx.input.after
      ? Math.floor(new Date(ctx.input.after).getTime() / 1000)
      : undefined;

    let activities = await client.listAthleteActivities({
      before: beforeEpoch,
      after: afterEpoch,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = activities.map((a: any) => ({
      activityId: a.id,
      name: a.name,
      sportType: a.sport_type || a.type,
      startDate: a.start_date,
      startDateLocal: a.start_date_local,
      timezone: a.timezone,
      distance: a.distance,
      movingTime: a.moving_time,
      elapsedTime: a.elapsed_time,
      totalElevationGain: a.total_elevation_gain,
      averageSpeed: a.average_speed,
      maxSpeed: a.max_speed,
      averageHeartrate: a.average_heartrate,
      maxHeartrate: a.max_heartrate,
      kudosCount: a.kudos_count,
      commentCount: a.comment_count
    }));

    return {
      output: {
        activities: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** activities.`
    };
  })
  .build();
