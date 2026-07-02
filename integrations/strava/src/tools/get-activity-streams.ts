import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivityStreams = SlateTool.create(spec, {
  name: 'Get Activity Streams',
  key: 'get_activity_streams',
  description: `Retrieve raw data streams for an activity. Streams are time-aligned arrays of data points such as GPS coordinates, heart rate, power, cadence, altitude, and more. All returned streams share the same length — values at a given index correspond to the same point in time.`,
  instructions: [
    'Available stream types: time, distance, latlng, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activityId: z.number().describe('The activity identifier'),
      streamTypes: z
        .array(z.string())
        .describe(
          'Stream types to retrieve, e.g. ["time", "heartrate", "watts", "latlng", "altitude"]'
        )
    })
  )
  .output(
    z.object({
      streams: z
        .array(
          z.object({
            type: z.string().describe('Stream type name'),
            seriesType: z.string().optional().describe('Series type (e.g., time or distance)'),
            originalSize: z.number().optional().describe('Number of data points'),
            resolution: z.string().optional().describe('Resolution level (low, medium, high)'),
            data: z.array(z.any()).describe('Array of data points')
          })
        )
        .describe('Retrieved data streams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rawStreams = await client.getActivityStreams(
      ctx.input.activityId,
      ctx.input.streamTypes
    );

    let streams = Array.isArray(rawStreams)
      ? rawStreams.map((s: any) => ({
          type: s.type,
          seriesType: s.series_type,
          originalSize: s.original_size,
          resolution: s.resolution,
          data: s.data
        }))
      : [];

    return {
      output: { streams },
      message: `Retrieved **${streams.length}** stream(s) for activity ${ctx.input.activityId}: ${streams.map(s => s.type).join(', ')}.`
    };
  })
  .build();
