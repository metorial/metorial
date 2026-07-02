import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let trackEventTool = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track a user event in SatisMeter. If a live survey is configured to trigger on this event, SatisMeter will display the survey to the user. Use this to trigger event-based surveys programmatically.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user who performed the event'),
      eventName: z
        .string()
        .describe(
          'Name of the event to track (must match the event name configured in the survey)'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID the event was tracked for'),
      eventName: z.string().describe('The name of the tracked event'),
      success: z.boolean().describe('Whether the event was tracked successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    await client.trackEvent({
      userId: ctx.input.userId,
      event: ctx.input.eventName,
      projectId: ctx.config.projectId
    });

    return {
      output: {
        userId: ctx.input.userId,
        eventName: ctx.input.eventName,
        success: true
      },
      message: `Tracked event **${ctx.input.eventName}** for user **${ctx.input.userId}**.`
    };
  })
  .build();
