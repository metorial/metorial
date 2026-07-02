import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all segments defined in Pendo. Returns segment names, IDs, and types. Segments are used to group visitors and accounts for analytics filtering and guide targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().describe('Segment name'),
            raw: z.any().describe('Full raw segment record')
          })
        )
        .describe('List of segments'),
      totalCount: z.number().describe('Total number of segments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    let segments = await client.listSegments();

    let mappedSegments = (Array.isArray(segments) ? segments : []).map((s: any) => ({
      segmentId: s.id || '',
      name: s.name || '',
      raw: s
    }));

    return {
      output: {
        segments: mappedSegments,
        totalCount: mappedSegments.length
      },
      message: `Found **${mappedSegments.length}** segment(s) in Pendo.`
    };
  })
  .build();
