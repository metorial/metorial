import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let trackUserEvent = SlateTool.create(spec, {
  name: 'Track User Event',
  key: 'track_user_event',
  description: `Track a custom event for a user in Appcues. Events are immediately available for flow targeting but take several minutes to appear in analytics/insights. Can include optional attributes and group association.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('The unique identifier of the user'),
      eventName: z.string().describe('Name of the event to track'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional key-value attributes for the event'),
      groupId: z.string().optional().describe('Optional group ID to associate with the event')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID the event was tracked for'),
      eventName: z.string().describe('The event name that was tracked'),
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    await client.trackUserEvent(ctx.input.userId, {
      name: ctx.input.eventName,
      timestamp: ctx.input.timestamp,
      attributes: ctx.input.attributes,
      groupId: ctx.input.groupId
    });

    return {
      output: {
        userId: ctx.input.userId,
        eventName: ctx.input.eventName,
        success: true
      },
      message: `Tracked event **${ctx.input.eventName}** for user \`${ctx.input.userId}\`.`
    };
  })
  .build();
