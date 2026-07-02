import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityEvent = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    'Triggers when activities are created, updated, or deleted. Polls for recent activities and detects changes.'
})
  .input(
    z.object({
      activityId: z.number().describe('The activity identifier'),
      eventType: z.enum(['created', 'updated', 'deleted']).describe('Type of event detected'),
      name: z.string().nullable().optional().describe('Activity name'),
      sportType: z.string().nullable().optional().describe('Sport type'),
      startDate: z.string().nullable().optional().describe('Start date in UTC'),
      distance: z.number().nullable().optional().describe('Distance in meters'),
      movingTime: z.number().nullable().optional().describe('Moving time in seconds'),
      elapsedTime: z.number().nullable().optional().describe('Elapsed time in seconds'),
      totalElevationGain: z
        .number()
        .nullable()
        .optional()
        .describe('Total elevation gain in meters')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('The activity identifier'),
      name: z.string().nullable().optional().describe('Activity name'),
      sportType: z.string().nullable().optional().describe('Sport type'),
      startDate: z.string().nullable().optional().describe('Start date in UTC'),
      startDateLocal: z.string().nullable().optional().describe('Start date in local time'),
      distance: z.number().nullable().optional().describe('Distance in meters'),
      movingTime: z.number().nullable().optional().describe('Moving time in seconds'),
      elapsedTime: z.number().nullable().optional().describe('Elapsed time in seconds'),
      totalElevationGain: z
        .number()
        .nullable()
        .optional()
        .describe('Total elevation gain in meters'),
      averageSpeed: z.number().nullable().optional().describe('Average speed in m/s'),
      maxSpeed: z.number().nullable().optional().describe('Max speed in m/s'),
      averageHeartrate: z.number().nullable().optional().describe('Average heart rate in bpm'),
      maxHeartrate: z.number().nullable().optional().describe('Max heart rate in bpm')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownActivityIds = (ctx.state?.knownActivityIds as number[]) || [];

      let afterEpoch = lastPollTime
        ? Math.floor(new Date(lastPollTime).getTime() / 1000)
        : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

      let activities = await client.listAthleteActivities({
        after: afterEpoch,
        perPage: 200
      });

      let currentIds = activities.map((a: any) => a.id as number);

      let newActivities = activities.filter((a: any) => !knownActivityIds.includes(a.id));

      let inputs = newActivities.map((a: any) => ({
        activityId: a.id as number,
        eventType: 'created' as const,
        name: a.name as string,
        sportType: (a.sport_type || a.type) as string,
        startDate: a.start_date as string,
        distance: a.distance as number,
        movingTime: a.moving_time as number,
        elapsedTime: a.elapsed_time as number,
        totalElevationGain: a.total_elevation_gain as number
      }));

      let updatedKnownIds = [...new Set([...knownActivityIds, ...currentIds])].slice(-500);

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownActivityIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let activityDetails: any = null;
      if (ctx.input.eventType !== 'deleted') {
        try {
          activityDetails = await client.getActivity(ctx.input.activityId);
        } catch {
          // Activity may no longer be accessible
        }
      }

      let output = activityDetails
        ? {
            activityId: activityDetails.id,
            name: activityDetails.name,
            sportType: activityDetails.sport_type || activityDetails.type,
            startDate: activityDetails.start_date,
            startDateLocal: activityDetails.start_date_local,
            distance: activityDetails.distance,
            movingTime: activityDetails.moving_time,
            elapsedTime: activityDetails.elapsed_time,
            totalElevationGain: activityDetails.total_elevation_gain,
            averageSpeed: activityDetails.average_speed,
            maxSpeed: activityDetails.max_speed,
            averageHeartrate: activityDetails.average_heartrate,
            maxHeartrate: activityDetails.max_heartrate
          }
        : {
            activityId: ctx.input.activityId,
            name: ctx.input.name,
            sportType: ctx.input.sportType,
            startDate: ctx.input.startDate,
            startDateLocal: null,
            distance: ctx.input.distance,
            movingTime: ctx.input.movingTime,
            elapsedTime: ctx.input.elapsedTime,
            totalElevationGain: ctx.input.totalElevationGain,
            averageSpeed: null,
            maxSpeed: null,
            averageHeartrate: null,
            maxHeartrate: null
          };

      return {
        type: `activity.${ctx.input.eventType}`,
        id: `activity_${ctx.input.activityId}_${ctx.input.eventType}`,
        output
      };
    }
  })
  .build();
