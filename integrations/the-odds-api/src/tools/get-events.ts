import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventSchema, mapEvent } from '../lib/schemas';
import { spec } from '../spec';

export let getEventsTool = SlateTool.create(spec, {
  name: 'Get Events',
  key: 'get_events',
  description: `List in-play and upcoming events for a sport without odds data. Useful for discovering event IDs before requesting odds or markets.
This is a free endpoint that does not count against the usage quota.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeRotationNumbers: z
        .boolean()
        .optional()
        .describe('Include home and away rotation numbers when available'),
      sport: z.string().describe('Sport key from list_sports (e.g. "americanfootball_nfl")'),
      eventIds: z.string().optional().describe('Comma-separated event IDs to filter'),
      commenceTimeFrom: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include events starting on or after'),
      commenceTimeTo: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include events starting on or before')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getEvents({
      includeRotationNumbers: ctx.input.includeRotationNumbers,
      sport: ctx.input.sport,
      eventIds: ctx.input.eventIds,
      commenceTimeFrom: ctx.input.commenceTimeFrom,
      commenceTimeTo: ctx.input.commenceTimeTo
    });

    let events = data.map(mapEvent);

    return {
      output: { events },
      message: `Found **${events.length}** events for **${ctx.input.sport}**.`
    };
  })
  .build();
