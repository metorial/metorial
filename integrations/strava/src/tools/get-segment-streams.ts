import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSegmentStreams = SlateTool.create(spec, {
  name: 'Get Segment Streams',
  key: 'get_segment_streams',
  description:
    'Retrieve a segment’s coordinate, distance, and altitude streams. Private segments require read_all scope.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      segmentId: exactIdSchema.describe(
        'Segment identifier from explore_segments, get_segment or list_starred_segments. Pass IDs beyond 9007199254740991 as exact decimal strings.'
      ),
      streamTypes: z
        .array(z.enum(['latlng', 'distance', 'altitude']))
        .describe('Stream keys to retrieve')
    })
  )
  .output(
    z.object({
      segmentIdString: z.string().describe('Exact segment identifier supplied in the request'),
      streams: z.any().describe('Complete requested streams keyed by type')
    })
  )
  .handleInvocation(async ctx => {
    let streams = await new Client(ctx.auth).getSegmentStreams(
      ctx.input.segmentId,
      ctx.input.streamTypes
    );
    return {
      output: { segmentIdString: String(ctx.input.segmentId), streams },
      message: 'Retrieved segment streams.'
    };
  })
  .build();
