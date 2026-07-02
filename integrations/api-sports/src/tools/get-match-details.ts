import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  timeElapsed: z.number().nullable().describe('Minute of the event'),
  timeExtra: z.number().nullable().describe('Extra time minutes'),
  teamId: z.number().nullable().describe('Team ID involved'),
  teamName: z.string().nullable().describe('Team name involved'),
  playerName: z.string().nullable().describe('Player name'),
  assistName: z.string().nullable().describe('Assist player name'),
  type: z.string().nullable().describe('Event type (Goal, Card, Subst, Var)'),
  detail: z.string().nullable().describe('Event detail (Normal Goal, Yellow Card, etc.)'),
  comments: z.string().nullable().describe('Additional comments')
});

let lineupPlayerSchema = z.object({
  playerName: z.string().nullable().describe('Player name'),
  playerNumber: z.number().nullable().describe('Shirt number'),
  position: z.string().nullable().describe('Position (G, D, M, F)'),
  grid: z.string().nullable().describe('Grid position on the pitch')
});

let lineupSchema = z.object({
  teamId: z.number().nullable().describe('Team ID'),
  teamName: z.string().nullable().describe('Team name'),
  formation: z.string().nullable().describe('Formation (e.g., 4-3-3)'),
  startingXI: z.array(lineupPlayerSchema).describe('Starting lineup'),
  substitutes: z.array(lineupPlayerSchema).describe('Bench players')
});

let statisticSchema = z.object({
  teamId: z.number().nullable().describe('Team ID'),
  teamName: z.string().nullable().describe('Team name'),
  stats: z
    .array(
      z.object({
        type: z.string().describe('Statistic type (e.g., Shots on Goal, Possession)'),
        value: z.union([z.string(), z.number()]).nullable().describe('Statistic value')
      })
    )
    .describe('Statistics for this team')
});

export let getMatchDetailsTool = SlateTool.create(spec, {
  name: 'Get Match Details',
  key: 'get_match_details',
  description: `Retrieve comprehensive details for a specific football fixture including in-game events (goals, cards, substitutions, VAR decisions), lineups with formations, and match statistics (possession, shots, corners, etc.). Combines data from multiple endpoints into a single response.`,
  instructions: [
    'This tool is designed for football fixtures. Use the fixtureId from the Get Fixtures tool.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fixtureId: z.number().describe('The fixture ID to get details for'),
      includeEvents: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include match events (goals, cards, etc.)'),
      includeLineups: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include team lineups and formations'),
      includeStatistics: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include match statistics')
    })
  )
  .output(
    z.object({
      fixtureId: z.number().describe('Fixture ID'),
      events: z
        .array(eventSchema)
        .nullable()
        .describe('Match events (goals, cards, substitutions)'),
      lineups: z.array(lineupSchema).nullable().describe('Team lineups and formations'),
      statistics: z.array(statisticSchema).nullable().describe('Match statistics per team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sport: 'football' });
    let fixtureId = ctx.input.fixtureId;

    let result: { events: any[] | null; lineups: any[] | null; statistics: any[] | null } = {
      events: null,
      lineups: null,
      statistics: null
    };

    let promises: Promise<void>[] = [];

    if (ctx.input.includeEvents) {
      promises.push(
        client.getFixtureEvents(fixtureId).then(data => {
          result.events = (data.response ?? []).map((e: any) => ({
            timeElapsed: e.time?.elapsed ?? null,
            timeExtra: e.time?.extra ?? null,
            teamId: e.team?.id ?? null,
            teamName: e.team?.name ?? null,
            playerName: e.player?.name ?? null,
            assistName: e.assist?.name ?? null,
            type: e.type ?? null,
            detail: e.detail ?? null,
            comments: e.comments ?? null
          }));
        })
      );
    }

    if (ctx.input.includeLineups) {
      promises.push(
        client.getFixtureLineups(fixtureId).then(data => {
          result.lineups = (data.response ?? []).map((l: any) => ({
            teamId: l.team?.id ?? null,
            teamName: l.team?.name ?? null,
            formation: l.formation ?? null,
            startingXI: (l.startXI ?? []).map((p: any) => ({
              playerName: p.player?.name ?? null,
              playerNumber: p.player?.number ?? null,
              position: p.player?.pos ?? null,
              grid: p.player?.grid ?? null
            })),
            substitutes: (l.substitutes ?? []).map((p: any) => ({
              playerName: p.player?.name ?? null,
              playerNumber: p.player?.number ?? null,
              position: p.player?.pos ?? null,
              grid: null
            }))
          }));
        })
      );
    }

    if (ctx.input.includeStatistics) {
      promises.push(
        client.getFixtureStatistics(fixtureId).then(data => {
          result.statistics = (data.response ?? []).map((s: any) => ({
            teamId: s.team?.id ?? null,
            teamName: s.team?.name ?? null,
            stats: (s.statistics ?? []).map((stat: any) => ({
              type: stat.type,
              value: stat.value
            }))
          }));
        })
      );
    }

    await Promise.all(promises);

    let eventCount = result.events?.length ?? 0;
    let lineupCount = result.lineups?.length ?? 0;

    return {
      output: {
        fixtureId,
        events: result.events,
        lineups: result.lineups,
        statistics: result.statistics
      },
      message: `Retrieved match details for fixture **#${fixtureId}**: ${eventCount} event(s), ${lineupCount} lineup(s), ${result.statistics ? 'statistics included' : 'no statistics'}.`
    };
  })
  .build();
