import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve detailed information about a specific activity, including metrics, segment efforts, laps, comments, and kudos. Use the optional flags to include additional data alongside the core activity details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The activity identifier'),
      includeAllEfforts: z
        .boolean()
        .optional()
        .describe('Include all segment efforts for the activity'),
      includeComments: z.boolean().optional().describe('Include comments on the activity'),
      includeKudos: z.boolean().optional().describe('Include list of kudoers'),
      includeLaps: z.boolean().optional().describe('Include lap data')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Activity identifier'),
      name: z.string().describe('Activity name'),
      description: z.string().nullable().optional().describe('Activity description'),
      sportType: z.string().describe('Sport type'),
      startDate: z.string().describe('Start date in UTC'),
      startDateLocal: z.string().describe('Start date in local time'),
      timezone: z.string().nullable().optional().describe('Timezone'),
      distance: z.number().describe('Distance in meters'),
      movingTime: z.number().describe('Moving time in seconds'),
      elapsedTime: z.number().describe('Elapsed time in seconds'),
      totalElevationGain: z.number().describe('Total elevation gain in meters'),
      averageSpeed: z.number().nullable().optional().describe('Average speed in m/s'),
      maxSpeed: z.number().nullable().optional().describe('Max speed in m/s'),
      averageHeartrate: z.number().nullable().optional().describe('Average heart rate bpm'),
      maxHeartrate: z.number().nullable().optional().describe('Max heart rate bpm'),
      averageWatts: z.number().nullable().optional().describe('Average power in watts'),
      maxWatts: z.number().nullable().optional().describe('Max power in watts'),
      averageCadence: z.number().nullable().optional().describe('Average cadence'),
      calories: z.number().nullable().optional().describe('Calories burned'),
      gearId: z.string().nullable().optional().describe('Gear identifier used'),
      deviceName: z.string().nullable().optional().describe('Recording device name'),
      segmentEfforts: z
        .array(z.any())
        .optional()
        .describe('Segment efforts within this activity'),
      comments: z.array(z.any()).optional().describe('Activity comments'),
      kudoers: z.array(z.any()).optional().describe('Athletes who gave kudos'),
      laps: z.array(z.any()).optional().describe('Lap data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let activity = await client.getActivity(ctx.input.activityId, ctx.input.includeAllEfforts);

    let comments: any[] | undefined;
    let kudoers: any[] | undefined;
    let laps: any[] | undefined;

    if (ctx.input.includeComments) {
      comments = await client.getActivityComments(ctx.input.activityId);
    }

    if (ctx.input.includeKudos) {
      kudoers = await client.getActivityKudoers(ctx.input.activityId);
    }

    if (ctx.input.includeLaps) {
      laps = await client.getActivityLaps(ctx.input.activityId);
    }

    return {
      output: {
        activityId: activity.id,
        name: activity.name,
        description: activity.description,
        sportType: activity.sport_type || activity.type,
        startDate: activity.start_date,
        startDateLocal: activity.start_date_local,
        timezone: activity.timezone,
        distance: activity.distance,
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time,
        totalElevationGain: activity.total_elevation_gain,
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        averageHeartrate: activity.average_heartrate,
        maxHeartrate: activity.max_heartrate,
        averageWatts: activity.average_watts,
        maxWatts: activity.max_watts,
        averageCadence: activity.average_cadence,
        calories: activity.calories,
        gearId: activity.gear_id,
        deviceName: activity.device_name,
        segmentEfforts: activity.segment_efforts,
        comments,
        kudoers,
        laps
      },
      message: `Retrieved activity **${activity.name}** (${activity.sport_type || activity.type}) — ${(activity.distance / 1000).toFixed(2)} km, ${Math.round(activity.moving_time / 60)} min.`
    };
  })
  .build();
