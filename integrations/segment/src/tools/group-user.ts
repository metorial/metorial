import { SlateTool } from 'slates';
import { z } from 'zod';
import { segmentServiceError } from '../lib/errors';
import { TrackingClient } from '../lib/tracking';
import { spec } from '../spec';

export let groupUser = SlateTool.create(spec, {
  name: 'Group User',
  key: 'group_user',
  description: `Send a Group call to Segment's Tracking API. Associates a user with a group (company, organization, account, team) and records group traits. Requires a write key.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Unique user identifier'),
      anonymousId: z.string().optional().describe('Anonymous identifier'),
      groupId: z.string().describe('Unique identifier for the group'),
      traits: z
        .record(z.string(), z.any())
        .optional()
        .describe('Group traits (e.g. name, industry, employees, plan)'),
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
    await client.group({
      userId: ctx.input.userId,
      anonymousId: ctx.input.anonymousId,
      groupId: ctx.input.groupId,
      traits: ctx.input.traits,
      context: ctx.input.context,
      timestamp: ctx.input.timestamp,
      integrations: ctx.input.integrations
    });

    return {
      output: { success: true },
      message: `Associated user \`${ctx.input.userId ?? ctx.input.anonymousId}\` with group \`${ctx.input.groupId}\``
    };
  })
  .build();
