import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createActivity = SlateTool.create(spec, {
  name: 'Create Activity',
  key: 'create_activity',
  description: `Create a new manual activity on Strava. Specify the sport type, start time, duration, and optionally distance and description. Requires \`activity:write\` scope.`,
  instructions: [
    "startDateLocal must be an ISO 8601 formatted date string in the athlete's local timezone",
    'elapsedTime is in seconds'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the activity'),
      sportType: z
        .string()
        .describe('Sport type, e.g. Run, Ride, Swim, Hike, Walk, MountainBikeRide, etc.'),
      startDateLocal: z
        .string()
        .describe("ISO 8601 start date in the athlete's local timezone"),
      elapsedTime: z.number().describe('Total elapsed time in seconds'),
      description: z.string().optional().describe('Description of the activity'),
      distance: z.number().optional().describe('Distance in meters'),
      trainer: z.boolean().optional().describe('Whether this was a trainer/indoor activity'),
      commute: z.boolean().optional().describe('Whether this was a commute')
    })
  )
  .output(
    z.object({
      activityId: z.number().describe('Created activity identifier'),
      name: z.string().describe('Activity name'),
      sportType: z.string().describe('Sport type'),
      startDate: z.string().describe('Start date in UTC'),
      distance: z.number().describe('Distance in meters'),
      movingTime: z.number().describe('Moving time in seconds'),
      elapsedTime: z.number().describe('Elapsed time in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let activity = await client.createActivity({
      name: ctx.input.name,
      sportType: ctx.input.sportType,
      startDateLocal: ctx.input.startDateLocal,
      elapsedTime: ctx.input.elapsedTime,
      description: ctx.input.description,
      distance: ctx.input.distance,
      trainer: ctx.input.trainer,
      commute: ctx.input.commute
    });

    return {
      output: {
        activityId: activity.id,
        name: activity.name,
        sportType: activity.sport_type || activity.type,
        startDate: activity.start_date,
        distance: activity.distance,
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time
      },
      message: `Created activity **${activity.name}** (${activity.sport_type || activity.type}) with ID ${activity.id}.`
    };
  })
  .build();
