import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let manageManualSegment = SlateTool.create(spec, {
  name: 'Manage Manual Segment',
  key: 'manage_manual_segment',
  description: `Add or remove people from a manual segment. Manual segments are static groups that you manage explicitly, unlike data-driven segments that update automatically based on criteria.`,
  instructions: [
    'This only works with manual segments, not data-driven segments.',
    'Provide customer IDs (not emails) to add or remove.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('The ID of the manual segment'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove people from the segment'),
      customerIds: z.array(z.string()).describe('Array of customer IDs to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'add') {
      await appClient.addToManualSegment(ctx.input.segmentId, ctx.input.customerIds);
    } else {
      await appClient.removeFromManualSegment(ctx.input.segmentId, ctx.input.customerIds);
    }

    return {
      output: { success: true },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${ctx.input.customerIds.length}** people ${ctx.input.action === 'add' ? 'to' : 'from'} segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
