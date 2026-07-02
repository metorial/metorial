import { SlateTool } from 'slates';
import { z } from 'zod';
import { pendoServiceError } from '../lib/errors';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

let segmentVisitorPatchSchema = z.object({
  op: z.enum(['add', 'remove']).describe('Whether to add or remove visitor IDs'),
  visitorIds: z.array(z.string()).min(1).describe('Visitor IDs for this operation')
});

export let patchSegmentVisitors = SlateTool.create(spec, {
  name: 'Patch Segment Visitors',
  key: 'patch_segment_visitors',
  description: `Add or remove small batches of visitors from an API-managed Pendo segment. Pendo limits each patch call to 10 operations and 1000 total visitors.`,
  constraints: [
    'Only API-created segments can be patched.',
    'Maximum 10 operations and 1000 total visitor IDs per call.'
  ]
})
  .input(
    z.object({
      segmentId: z.string().describe('The API-created segment ID to patch'),
      operations: z
        .array(segmentVisitorPatchSchema)
        .min(1)
        .max(10)
        .describe('Patch operations to add or remove visitors')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Patched segment ID'),
      operationCount: z.number().describe('Number of patch operations submitted'),
      visitorCount: z.number().describe('Number of visitor IDs submitted'),
      success: z.boolean().describe('Whether Pendo accepted the patch request'),
      raw: z.any().optional().describe('Raw Pendo patch response')
    })
  )
  .handleInvocation(async ctx => {
    let visitorCount = ctx.input.operations.reduce(
      (sum, operation) => sum + operation.visitorIds.length,
      0
    );
    if (visitorCount > 1000) {
      throw pendoServiceError('Pendo segment visitor patches support at most 1000 visitors.');
    }

    let client = createPendoClient(ctx);
    let result = await client.patchSegmentVisitors(ctx.input.segmentId, ctx.input.operations);

    return {
      output: {
        segmentId: ctx.input.segmentId,
        operationCount: ctx.input.operations.length,
        visitorCount,
        success: true,
        raw: result
      },
      message: `Submitted **${ctx.input.operations.length}** visitor patch operation(s) for Pendo segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
