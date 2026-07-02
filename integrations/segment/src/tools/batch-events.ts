import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let batchEvents = SlateTool.create(spec, {
  name: 'Batch Events',
  key: 'batch_events',
  description: `Send a batch of Identify, Track, Page, Screen, Group, or Alias calls in a single request to Segment's Tracking API. More efficient than individual calls for high-volume data import. Requires a write key.`,
  constraints: [
    'Maximum of 500 KB per batch request and 32 KB per individual event.',
    'Maximum of 2,500 events per batch.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      batch: z
        .array(
          z.object({
            type: z
              .enum(['identify', 'track', 'page', 'screen', 'group', 'alias'])
              .describe('Event type'),
            userId: z.string().optional().describe('User ID'),
            anonymousId: z.string().optional().describe('Anonymous ID'),
            event: z.string().optional().describe('Event name (required for track)'),
            properties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Event properties (track, page, screen)'),
            traits: z
              .record(z.string(), z.any())
              .optional()
              .describe('User/group traits (identify, group)'),
            groupId: z.string().optional().describe('Group ID (required for group)'),
            previousId: z.string().optional().describe('Previous ID (required for alias)'),
            name: z.string().optional().describe('Page/screen name'),
            category: z.string().optional().describe('Page/screen category'),
            context: z.record(z.string(), z.any()).optional().describe('Context object'),
            timestamp: z.string().optional().describe('ISO 8601 timestamp'),
            integrations: z
              .record(z.string(), z.any())
              .optional()
              .describe('Selective destination forwarding')
          })
        )
        .describe('Array of events to send'),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Shared context for all events in the batch')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the batch was accepted'),
      eventCount: z.number().describe('Number of events in the batch')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeKey) {
      throw new Error('A write key is required to use the Tracking API.');
    }

    let client = new TrackingClient(ctx.auth.writeKey, ctx.config.region);
    await client.batch({
      batch: ctx.input.batch,
      context: ctx.input.context
    });

    return {
      output: {
        success: true,
        eventCount: ctx.input.batch.length
      },
      message: `Sent batch of **${ctx.input.batch.length}** events`
    };
  })
  .build();
