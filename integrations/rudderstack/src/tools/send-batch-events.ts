import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let sendBatchEvents = SlateTool.create(spec, {
  name: 'Send Batch Events',
  key: 'send_batch_events',
  description: `Send multiple customer events to RudderStack in a single batch request. Each event in the batch includes a \`type\` field specifying the call type (identify, track, page, screen, group, alias) and its corresponding payload.
Ideal for bulk imports, historical data backfills, or high-throughput event ingestion.`,
  constraints: ['Maximum batch size is 4MB total and 32KB per individual event.'],
  tags: {
    destructive: false,
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
            userId: z.string().optional().describe('Unique user identifier'),
            anonymousId: z.string().optional().describe('Anonymous user identifier'),
            event: z.string().optional().describe('Event name (for track events)'),
            traits: z.record(z.string(), z.any()).optional().describe('User/group traits'),
            properties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Event/page/screen properties'),
            groupId: z.string().optional().describe('Group identifier'),
            previousId: z.string().optional().describe('Previous user ID (for alias events)'),
            name: z.string().optional().describe('Page or screen name'),
            context: z
              .record(z.string(), z.any())
              .optional()
              .describe('Contextual information'),
            timestamp: z.string().optional().describe('ISO 8601 timestamp'),
            integrations: z
              .record(z.string(), z.any())
              .optional()
              .describe('Destination-specific flags')
          })
        )
        .describe('Array of events to send in the batch')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the batch was accepted'),
      eventCount: z.number().describe('Number of events sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.sourceWriteKey) {
      throw new Error(
        'Source Write Key is required to send events. Please configure it in your authentication settings.'
      );
    }
    if (!ctx.config.datePlaneUrl) {
      throw new Error(
        'Data Plane URL is required to send events. Please configure it in your settings.'
      );
    }

    let client = new DataPlaneClient({
      sourceWriteKey: ctx.auth.sourceWriteKey,
      dataPlaneUrl: ctx.config.datePlaneUrl
    });

    await client.batch({ batch: ctx.input.batch });

    return {
      output: {
        success: true,
        eventCount: ctx.input.batch.length
      },
      message: `Successfully sent batch of **${ctx.input.batch.length}** events.`
    };
  })
  .build();
