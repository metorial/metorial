import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let identifyUser = SlateTool.create(spec, {
  name: 'Identify User',
  key: 'identify_user',
  description: `Send an Identify call to Segment's Tracking API. Ties a user to their traits like email, name, and plan. Requires a write key.`,
  instructions: [
    'Provide either userId or anonymousId (or both).',
    'Traits should include user-level attributes such as email, name, plan, age, etc.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Unique user identifier'),
      anonymousId: z.string().optional().describe('Anonymous identifier'),
      traits: z
        .record(z.string(), z.any())
        .optional()
        .describe('User traits (e.g. email, name, plan)'),
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
      throw new Error('A write key is required to use the Tracking API.');
    }
    if (!ctx.input.userId && !ctx.input.anonymousId) {
      throw new Error('Either userId or anonymousId is required');
    }

    let client = new TrackingClient(ctx.auth.writeKey, ctx.config.region);
    await client.identify({
      userId: ctx.input.userId,
      anonymousId: ctx.input.anonymousId,
      traits: ctx.input.traits,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp,
      integrations: ctx.input.integrations
    });

    return {
      output: { success: true },
      message: `Identified user \`${ctx.input.userId ?? ctx.input.anonymousId}\``
    };
  })
  .build();
