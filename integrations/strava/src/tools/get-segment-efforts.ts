import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSegmentEfforts = SlateTool.create(spec, {
  name: 'Get Segment Efforts',
  key: 'get_segment_efforts',
  description: `List the authenticated athlete's efforts on a given segment, optionally filtered by date range. Each effort includes timing, heart rate, power, and ranking data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('The segment identifier'),
      startDateLocal: z.string().optional().describe('Only efforts after this ISO 8601 date'),
      endDateLocal: z.string().optional().describe('Only efforts before this ISO 8601 date'),
      perPage: z.number().optional().describe('Number of efforts per page (max 200)')
    })
  )
  .output(
    z.object({
      efforts: z
        .array(
          z.object({
            effortId: z.number().describe('Segment effort identifier'),
            activityId: z.number().describe('Parent activity identifier'),
            segmentId: z.number().describe('Segment identifier'),
            name: z.string().describe('Segment name'),
            elapsedTime: z.number().describe('Elapsed time in seconds'),
            movingTime: z.number().describe('Moving time in seconds'),
            startDate: z.string().describe('Effort start date in UTC'),
            startDateLocal: z.string().describe('Effort start date in local time'),
            distance: z.number().describe('Distance in meters'),
            averageHeartrate: z.number().nullable().optional().describe('Average heart rate'),
            maxHeartrate: z.number().nullable().optional().describe('Max heart rate'),
            averageWatts: z.number().nullable().optional().describe('Average power in watts'),
            prRank: z.number().nullable().optional().describe('PR rank (1-3) or null')
          })
        )
        .describe('Segment efforts'),
      count: z.number().describe('Number of efforts returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let efforts = await client.listSegmentEfforts(ctx.input.segmentId, {
      startDateLocal: ctx.input.startDateLocal,
      endDateLocal: ctx.input.endDateLocal,
      perPage: ctx.input.perPage
    });

    let mapped = efforts.map((e: any) => ({
      effortId: e.id,
      activityId: e.activity?.id ?? e.activity_id,
      segmentId: e.segment?.id ?? ctx.input.segmentId,
      name: e.name,
      elapsedTime: e.elapsed_time,
      movingTime: e.moving_time,
      startDate: e.start_date,
      startDateLocal: e.start_date_local,
      distance: e.distance,
      averageHeartrate: e.average_heartrate,
      maxHeartrate: e.max_heartrate,
      averageWatts: e.average_watts,
      prRank: e.pr_rank
    }));

    return {
      output: {
        efforts: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** efforts on segment ${ctx.input.segmentId}.`
    };
  })
  .build();
