import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getUserEvents = SlateTool.create(spec, {
  name: 'Get User Events',
  key: 'get_user_events',
  description: `Retrieve recent event history for a specific user in Appcues. Returns events with their names, timestamps, and attributes. Supports limiting the number of results and specifying a time zone.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The unique identifier of the user'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of events to return (default: 100)'),
      timeZone: z.string().optional().describe('Time zone for timestamps (default: UTC)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID'),
      events: z
        .array(
          z.object({
            eventName: z.string().describe('Name of the event'),
            timestamp: z.string().describe('When the event occurred'),
            attributes: z.record(z.string(), z.any()).optional().describe('Event attributes')
          })
        )
        .describe('List of recent events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let events = await client.getUserEvents(
      ctx.input.userId,
      ctx.input.limit,
      ctx.input.timeZone
    );
    let eventList = Array.isArray(events) ? events : [];

    return {
      output: {
        userId: ctx.input.userId,
        events: eventList.map((e: any) => ({
          eventName: e.name || '',
          timestamp: e.timestamp || '',
          attributes: e.attributes || undefined
        }))
      },
      message: `Retrieved **${eventList.length}** events for user \`${ctx.input.userId}\`.`
    };
  })
  .build();
