import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSegment = SlateTool.create(spec, {
  name: 'Get Segment',
  key: 'get_segment',
  description: `Retrieve detailed information about a specific segment including its location, distance, elevation, climb category, and athlete-specific data such as personal records and star status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('The segment identifier')
    })
  )
  .output(
    z.object({
      segmentId: z.number().describe('Segment identifier'),
      name: z.string().describe('Segment name'),
      activityType: z.string().describe('Activity type (Ride or Run)'),
      distance: z.number().describe('Distance in meters'),
      averageGrade: z.number().describe('Average grade percentage'),
      maximumGrade: z.number().describe('Maximum grade percentage'),
      elevationHigh: z.number().describe('Highest elevation in meters'),
      elevationLow: z.number().describe('Lowest elevation in meters'),
      climbCategory: z.number().describe('Climb category (0=HC, 5=easiest)'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State'),
      country: z.string().nullable().optional().describe('Country'),
      totalElevationGain: z.number().optional().describe('Total elevation gain in meters'),
      effortCount: z.number().optional().describe('Total number of efforts'),
      athleteCount: z.number().optional().describe('Total number of unique athletes'),
      starCount: z.number().optional().describe('Number of stars'),
      starred: z
        .boolean()
        .optional()
        .describe('Whether the authenticated athlete has starred this segment'),
      startLatlng: z.array(z.number()).optional().describe('[latitude, longitude] of start'),
      endLatlng: z.array(z.number()).optional().describe('[latitude, longitude] of end')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let segment = await client.getSegment(ctx.input.segmentId);

    return {
      output: {
        segmentId: segment.id,
        name: segment.name,
        activityType: segment.activity_type,
        distance: segment.distance,
        averageGrade: segment.average_grade,
        maximumGrade: segment.maximum_grade,
        elevationHigh: segment.elevation_high,
        elevationLow: segment.elevation_low,
        climbCategory: segment.climb_category,
        city: segment.city,
        state: segment.state,
        country: segment.country,
        totalElevationGain: segment.total_elevation_gain,
        effortCount: segment.effort_count,
        athleteCount: segment.athlete_count,
        starCount: segment.star_count,
        starred: segment.starred,
        startLatlng: segment.start_latlng,
        endLatlng: segment.end_latlng
      },
      message: `Retrieved segment **${segment.name}** — ${(segment.distance / 1000).toFixed(2)} km, avg grade ${segment.average_grade}%.`
    };
  })
  .build();
