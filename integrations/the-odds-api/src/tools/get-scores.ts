import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scoreEntrySchema = z.object({
  name: z.string().describe('Team or participant name'),
  score: z.string().describe('Current score value')
});

let eventScoreSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  sportKey: z.string().describe('Sport key'),
  sportTitle: z.string().describe('Sport display name'),
  commenceTime: z.string().describe('ISO timestamp of event start time'),
  homeTeam: z.string().nullable().describe('Home team name'),
  awayTeam: z.string().nullable().describe('Away team name'),
  completed: z.boolean().describe('Whether the game has completed'),
  scores: z
    .array(scoreEntrySchema)
    .nullable()
    .describe('Current scores for each team (null if game has not started)'),
  lastUpdate: z.string().nullable().describe('ISO timestamp of last score update')
});

export let getScoresTool = SlateTool.create(spec, {
  name: 'Get Scores',
  key: 'get_scores',
  description: `Retrieve game scores and results for a given sport. Returns upcoming, live, and recently completed games with live scores that update approximately every 30 seconds.
Event IDs match those from the odds endpoints for easy correlation.`,
  instructions: [
    'Set daysFrom to include completed games (1-3 days).',
    'Without daysFrom, only upcoming and in-progress games are returned.'
  ],
  constraints: [
    'Costs 1 credit without daysFrom, 2 credits with daysFrom.',
    'Only completed games up to 3 days ago are available.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key (e.g. "americanfootball_nfl")'),
      daysFrom: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Include completed games from the last 1-3 days'),
      eventIds: z.string().optional().describe('Comma-separated event IDs to filter')
    })
  )
  .output(
    z.object({
      events: z.array(eventScoreSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getScores({
      sport: ctx.input.sport,
      daysFrom: ctx.input.daysFrom,
      eventIds: ctx.input.eventIds
    });

    let events = data.map(e => ({
      eventId: e.id,
      sportKey: e.sport_key,
      sportTitle: e.sport_title,
      commenceTime: e.commence_time,
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      completed: e.completed,
      scores: e.scores,
      lastUpdate: e.last_update
    }));

    let completed = events.filter(e => e.completed).length;
    let live = events.filter(e => !e.completed && e.scores !== null).length;
    let upcoming = events.filter(e => !e.completed && e.scores === null).length;

    return {
      output: { events },
      message: `Found **${events.length}** events for **${ctx.input.sport}**: ${live} live, ${completed} completed, ${upcoming} upcoming.`
    };
  })
  .build();
