import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getSegmentMembership = SlateTool.create(spec, {
  name: 'Get Segment Membership',
  key: 'get_segment_membership',
  description: `Retrieve the people who belong to a specific segment. Returns a paginated list of customer IDs in the segment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('The ID of the segment to get membership for'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      customerIds: z.array(z.string()).describe('Array of customer IDs in the segment'),
      next: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.getSegmentMembership(
      ctx.input.segmentId,
      ctx.input.cursor,
      ctx.input.limit
    );
    let customerIds = result?.ids ?? result?.customers ?? [];

    return {
      output: {
        customerIds,
        next: result?.next
      },
      message: `Retrieved **${customerIds.length}** members from segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
