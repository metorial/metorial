import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let deleteSegment = SlateTool.create(spec, {
  name: 'Delete Segment',
  key: 'delete_segment',
  description: `Delete a segment from Pendo by segment ID. This permanently removes the segment definition. Requires an integration key with write access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('The ID of the segment to delete')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('The segment ID that was deleted'),
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    await client.deleteSegment(ctx.input.segmentId);

    return {
      output: {
        segmentId: ctx.input.segmentId,
        success: true
      },
      message: `Deleted segment **${ctx.input.segmentId}** from Pendo.`
    };
  })
  .build();
