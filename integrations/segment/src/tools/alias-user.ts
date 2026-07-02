import { SlateTool } from 'slates';
import { z } from 'zod';
import { segmentServiceError } from '../lib/errors';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let aliasUser = SlateTool.create(spec, {
  name: 'Alias User',
  key: 'alias_user',
  description: `Send an Alias call to Segment's Tracking API. Merges two user identities by linking a previousId to a new userId. Useful when an anonymous user signs up and you want to combine their pre- and post-signup activity. Requires a write key.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      previousId: z.string().describe('The anonymous ID or previous user ID to link from'),
      userId: z.string().describe('The new user ID to link to'),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Context object with additional info'),
      timestamp: z.string().optional().describe('ISO 8601 timestamp'),
      integrations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Selective destination forwarding')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the call was accepted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeKey) {
      throw segmentServiceError('A write key is required to use the Tracking API.');
    }

    let client = new TrackingClient(ctx.auth.writeKey, ctx.config.region);
    await client.alias({
      previousId: ctx.input.previousId,
      userId: ctx.input.userId,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp,
      integrations: ctx.input.integrations
    });

    return {
      output: { success: true },
      message: `Aliased \`${ctx.input.previousId}\` to \`${ctx.input.userId}\``
    };
  })
  .build();
