import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient, TrackClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageManualSegment = SlateTool.create(spec, {
  name: 'Manage Manual Segment',
  key: 'manage_manual_segment',
  description: `Create or delete a manual segment, or add/remove people from one. Manual segments are static groups that you manage explicitly, unlike data-driven segments that update automatically based on criteria.`,
  instructions: [
    'Use "create" to create an empty manual segment.',
    'Use "delete" to remove a manual segment.',
    'Use "add" or "remove" with customer IDs (not emails) to manage membership.',
    'Add/remove only works with manual segments, not data-driven segments.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'add', 'remove'])
        .describe('The manual-segment operation to perform'),
      segmentId: z
        .number()
        .optional()
        .describe('The ID of the manual segment. Required for delete, add, and remove.'),
      name: z.string().optional().describe('Segment name. Required for create.'),
      description: z.string().optional().describe('Optional description for create.'),
      customerIds: z
        .array(z.string())
        .optional()
        .describe('Array of customer IDs to add or remove')
    })
  )
  .output(
    z.object({
      segmentId: z.number().optional().describe('The created or affected segment ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw customerIoServiceError('name is required to create a manual segment.');
      }
      let result = await appClient.createManualSegment(ctx.input.name, ctx.input.description);
      let segmentId = result?.segment?.id ?? result?.id;

      return {
        output: { segmentId, success: true },
        message: `Created manual segment **${ctx.input.name}**.`
      };
    }

    if (!ctx.input.segmentId) {
      throw customerIoServiceError(`segmentId is required for "${ctx.input.action}".`);
    }

    if (ctx.input.action === 'delete') {
      await appClient.deleteManualSegment(ctx.input.segmentId);

      return {
        output: { segmentId: ctx.input.segmentId, success: true },
        message: `Deleted manual segment **${ctx.input.segmentId}**.`
      };
    }

    if (!ctx.input.customerIds || ctx.input.customerIds.length === 0) {
      throw customerIoServiceError(
        `customerIds must include at least one customer ID for "${ctx.input.action}".`
      );
    }

    if (ctx.input.action === 'add') {
      await trackClient.addToManualSegment(ctx.input.segmentId, ctx.input.customerIds);
    } else {
      await trackClient.removeFromManualSegment(ctx.input.segmentId, ctx.input.customerIds);
    }

    return {
      output: { segmentId: ctx.input.segmentId, success: true },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${ctx.input.customerIds.length}** people ${ctx.input.action === 'add' ? 'to' : 'from'} segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
