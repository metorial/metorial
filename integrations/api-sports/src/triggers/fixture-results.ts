import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fixtureResultsTrigger = SlateTrigger.create(spec, {
  name: 'Fixture Results',
  key: 'fixture_results',
  description:
    'Triggers when new fixture results become available for a configured league and season. Polls for recently finished fixtures and emits events for each new result. Useful for tracking completed matches.'
})
  .input(
    z.object({
      fixtureId: z.number().describe('Fixture ID'),
      homeTeamName: z.string().nullable().describe('Home team name'),
      awayTeamName: z.string().nullable().describe('Away team name'),
      homeTeamId: z.number().nullable().describe('Home team ID'),
      awayTeamId: z.number().nullable().describe('Away team ID'),
      leagueName: z.string().nullable().describe('League name'),
      leagueId: z.number().nullable().describe('League ID'),
      homeScore: z.number().nullable().describe('Home team final score'),
      awayScore: z.number().nullable().describe('Away team final score'),
      date: z.string().nullable().describe('Fixture date'),
      round: z.string().nullable().describe('Round or matchday'),
      venueName: z.string().nullable().describe('Venue name')
    })
  )
  .output(
    z.object({
      fixtureId: z.number().describe('Fixture ID'),
      homeTeamName: z.string().nullable().describe('Home team name'),
      awayTeamName: z.string().nullable().describe('Away team name'),
      homeTeamId: z.number().nullable().describe('Home team ID'),
      awayTeamId: z.number().nullable().describe('Away team ID'),
      leagueName: z.string().nullable().describe('League name'),
      leagueId: z.number().nullable().describe('League ID'),
      homeScore: z.number().nullable().describe('Home team final score'),
      awayScore: z.number().nullable().describe('Away team final score'),
      date: z.string().nullable().describe('Fixture date'),
      round: z.string().nullable().describe('Round or matchday'),
      venueName: z.string().nullable().describe('Venue name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let sport = ctx.config.sport;
      let client = new Client({ token: ctx.auth.token, sport });
      let seenFixtures: Record<string, boolean> = ctx.state?.seenFixtures ?? {};

      // Get today's date in YYYY-MM-DD format
      let today = new Date().toISOString().split('T')[0]!;

      let data: any;
      if (sport === 'football') {
        data = await client.getFootballFixtures({ date: today, status: 'FT-AET-PEN-AWD-WO' });
      } else {
        data = await client.getFixtures({ date: today, status: 'FT-AET-PEN-AWD-WO' });
      }

      let inputs: any[] = [];
      let updatedSeen = { ...seenFixtures };

      for (let item of data.response ?? []) {
        let isFootball = sport === 'football';
        let fixtureId = isFootball ? item.fixture?.id : item.id;
        if (!fixtureId) continue;

        let key = String(fixtureId);
        if (updatedSeen[key]) continue;
        updatedSeen[key] = true;

        let teams = item.teams ?? {};
        let goals = isFootball ? (item.goals ?? {}) : (item.scores ?? {});

        inputs.push({
          fixtureId,
          homeTeamName: teams.home?.name ?? null,
          awayTeamName: teams.away?.name ?? null,
          homeTeamId: teams.home?.id ?? null,
          awayTeamId: teams.away?.id ?? null,
          leagueName: item.league?.name ?? null,
          leagueId: item.league?.id ?? null,
          homeScore: isFootball
            ? (goals.home ?? null)
            : (goals.home?.total ?? goals.home ?? null),
          awayScore: isFootball
            ? (goals.away ?? null)
            : (goals.away?.total ?? goals.away ?? null),
          date: isFootball ? (item.fixture?.date ?? null) : (item.date ?? null),
          round: isFootball ? (item.league?.round ?? null) : null,
          venueName: isFootball ? (item.fixture?.venue?.name ?? null) : null
        });
      }

      // Trim seen fixtures if they grow too large (keep last 2000)
      let seenKeys = Object.keys(updatedSeen);
      if (seenKeys.length > 2000) {
        let trimmed: Record<string, boolean> = {};
        for (let k of seenKeys.slice(-1000)) {
          trimmed[k] = true;
        }
        updatedSeen = trimmed;
      }

      return {
        inputs,
        updatedState: {
          seenFixtures: updatedSeen
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      return {
        type: 'fixture.finished',
        id: String(input.fixtureId),
        output: {
          fixtureId: input.fixtureId,
          homeTeamName: input.homeTeamName,
          awayTeamName: input.awayTeamName,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          leagueName: input.leagueName,
          leagueId: input.leagueId,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          date: input.date,
          round: input.round,
          venueName: input.venueName
        }
      };
    }
  })
  .build();
