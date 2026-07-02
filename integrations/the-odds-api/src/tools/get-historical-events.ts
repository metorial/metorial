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

export let getHistoricalEventsTool = SlateTool.create(spec, {
  name: 'Get Historical Events',
  key: 'get_historical_events',
  description: `Retrieve event listings as they appeared at a specific historical timestamp. Useful for discovering historical event IDs needed to query historical event-level odds via **Get Historical Odds**.`,
  instructions: [
    'Use ISO 8601 format for the date parameter.',
    'Use previousTimestamp and nextTimestamp to navigate between snapshots.'
  ],
  constraints: ['Costs 1 API credit (0 if no events found).', 'Only available on paid plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")'),
      date: z
        .string()
        .describe('ISO 8601 timestamp for the snapshot (e.g. "2023-10-15T12:00:00Z")'),
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
      timestamp: z.string().describe('Actual timestamp of the snapshot returned'),
      previousTimestamp: z.string().nullable().describe('Timestamp of the previous snapshot'),
      nextTimestamp: z.string().nullable().describe('Timestamp of the next snapshot'),
      events: z.array(eventSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, date, eventIds, commenceTimeFrom, commenceTimeTo } = ctx.input;

    let response = await client.getHistoricalEvents({
      sport,
      date,
      eventIds,
      commenceTimeFrom,
      commenceTimeTo
    });

    let events = response.data.map(e => ({
      eventId: e.id,
      sportKey: e.sport_key,
      sportTitle: e.sport_title,
      commenceTime: e.commence_time,
      homeTeam: e.home_team,
      awayTeam: e.away_team
    }));

    return {
      output: {
        timestamp: response.timestamp,
        previousTimestamp: response.previous_timestamp,
        nextTimestamp: response.next_timestamp,
        events
      },
      message: `Retrieved **${events.length}** historical events at **${response.timestamp}** for **${sport}**.`
    };
  })
  .build();
