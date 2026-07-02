import { SlateTool } from 'slates';
import { z } from 'zod';
import { segmentServiceError } from '../lib/errors';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Send a Track event to Segment's Tracking API. Records a user action or event with optional properties. Requires a write key to be configured in authentication.`,
  instructions: [
    'Provide either userId or anonymousId (or both) to identify the user.',
    'The event name should follow a consistent naming convention like "Object Action" (e.g. "Order Completed").'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Unique user identifier'),
      anonymousId: z
        .string()
        .optional()
        .describe('Anonymous identifier for users not yet identified'),
      event: z.string().describe('Name of the event (e.g. "Order Completed")'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Properties associated with the event'),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Context object with additional info like IP, userAgent, etc.'),
      timestamp: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for the event (for historical import)'),
      integrations: z
        .record(z.string(), z.any())
        .optional()
        .describe('Selective destination forwarding (e.g. {"All": true, "Mixpanel": false})')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was accepted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeKey) {
      throw segmentServiceError(
        'A write key is required to use the Tracking API. Configure it in your authentication settings.'
      );
    }
    if (!ctx.input.userId && !ctx.input.anonymousId) {
      throw segmentServiceError('Either userId or anonymousId is required');
    }

    let client = new TrackingClient(ctx.auth.writeKey, ctx.config.region);
    await client.track({
      userId: ctx.input.userId,
      anonymousId: ctx.input.anonymousId,
      event: ctx.input.event,
      properties: ctx.input.properties,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp,
      integrations: ctx.input.integrations
    });

    return {
      output: { success: true },
      message: `Tracked event **${ctx.input.event}** for user \`${ctx.input.userId ?? ctx.input.anonymousId}\``
    };
  })
  .build();
