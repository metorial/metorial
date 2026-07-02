import { SlateTool } from 'slates';
import { z } from 'zod';
import { segmentServiceError } from '../lib/errors';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let pageScreen = SlateTool.create(spec, {
  name: 'Record Page or Screen View',
  key: 'page_screen',
  description: `Send a Page or Screen call to Segment's Tracking API. Records a page view (web) or screen view (mobile) with optional properties. Requires a write key.`,
  instructions: [
    'Use type "page" for web page views and "screen" for mobile screen views.',
    'Provide either userId or anonymousId (or both).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      type: z
        .enum(['page', 'screen'])
        .describe('Whether this is a page view (web) or screen view (mobile)'),
      userId: z.string().optional().describe('Unique user identifier'),
      anonymousId: z.string().optional().describe('Anonymous identifier'),
      name: z.string().optional().describe('Name of the page or screen'),
      category: z.string().optional().describe('Category of the page or screen'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Properties of the page/screen (e.g. url, title, referrer)'),
      context: z
        .record(z.string(), z.any())
        .optional()
        .describe('Context object with additional info'),
      timestamp: z.string().optional().describe('ISO 8601 timestamp (for historical import)'),
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
    if (!ctx.input.userId && !ctx.input.anonymousId) {
      throw segmentServiceError('Either userId or anonymousId is required');
    }

    let client = new TrackingClient(ctx.auth.writeKey, ctx.config.region);
    let payload = {
      userId: ctx.input.userId,
      anonymousId: ctx.input.anonymousId,
      name: ctx.input.name,
      category: ctx.input.category,
      properties: ctx.input.properties,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp,
      integrations: ctx.input.integrations
    };

    if (ctx.input.type === 'page') {
      await client.page(payload);
    } else {
      await client.screen(payload);
    }

    return {
      output: { success: true },
      message: `Recorded ${ctx.input.type} view **${ctx.input.name ?? '(unnamed)'}** for user \`${ctx.input.userId ?? ctx.input.anonymousId}\``
    };
  })
  .build();
