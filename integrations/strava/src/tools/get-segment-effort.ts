import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSegmentEffort = SlateTool.create(spec, {
  name: 'Get Segment Effort',
  key: 'get_segment_effort',
  description:
    'Retrieve an authenticated athlete’s segment effort and optionally its raw streams. Strava requires a subscription. Optional effort streams require read_all scope.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      effortId: exactIdSchema.describe(
        'Segment effort identifier from get_segment_efforts or get_activity. Pass IDs beyond 9007199254740991 as exact decimal strings.'
      ),
      streamTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Optional stream keys, such as time, distance, latlng, altitude, heartrate or watts'
        )
    })
  )
  .output(
    z.object({
      effortIdString: z
        .string()
        .describe('Exact segment effort identifier supplied in the request'),
      effort: z.any().describe('Complete detailed segment effort returned by Strava'),
      streams: z.any().optional().describe('Requested streams returned by Strava')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let effort = await client.getSegmentEffort(ctx.input.effortId);
    let streams = ctx.input.streamTypes
      ? await client.getSegmentEffortStreams(ctx.input.effortId, ctx.input.streamTypes)
      : undefined;
    return {
      output: { effortIdString: String(ctx.input.effortId), effort, streams },
      message: 'Retrieved segment effort.'
    };
  })
  .build();
