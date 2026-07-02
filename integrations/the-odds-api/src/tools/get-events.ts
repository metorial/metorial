import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  sportKey: z.string().describe('Sport key'),
  sportTitle: z.string().describe('Sport display name'),
  commenceTime: z.string().describe('ISO timestamp of event start time'),
  homeTeam: z.string().nullable().describe('Home team name'),
  awayTeam: z.string().nullable().describe('Away team name')
});

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
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")'),
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
      sport: ctx.input.sport,
      eventIds: ctx.input.eventIds,
      commenceTimeFrom: ctx.input.commenceTimeFrom,
      commenceTimeTo: ctx.input.commenceTimeTo
    });

    let events = data.map(e => ({
      eventId: e.id,
      sportKey: e.sport_key,
      sportTitle: e.sport_title,
      commenceTime: e.commence_time,
      homeTeam: e.home_team,
      awayTeam: e.away_team
    }));

    return {
      output: { events },
      message: `Found **${events.length}** events for **${ctx.input.sport}**.`
    };
  })
  .build();
