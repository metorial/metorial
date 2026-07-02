import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let fixtureStatusChangeTrigger = SlateTrigger.create(spec, {
  name: 'Fixture Status Change',
  key: 'fixture_status_change',
  description:
    'Triggers when a fixture starts, finishes, or changes status (e.g., halftime, extra time). Polls for live fixtures and detects status transitions. Covers football and other supported sports.'
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
      statusShort: z.string().describe('Short status code'),
      statusLong: z.string().nullable().describe('Full status description'),
      homeScore: z.number().nullable().describe('Home team score'),
      awayScore: z.number().nullable().describe('Away team score'),
      elapsed: z.number().nullable().describe('Elapsed minutes'),
      date: z.string().nullable().describe('Fixture date'),
      changeType: z
        .enum([
          'started',
          'halftime',
          'second_half',
          'extra_time',
          'penalties',
          'finished',
          'status_changed'
        ])
        .describe('Type of status change')
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
      statusShort: z.string().describe('Current short status code'),
      statusLong: z.string().nullable().describe('Current full status description'),
      homeScore: z.number().nullable().describe('Current home team score'),
      awayScore: z.number().nullable().describe('Current away team score'),
      elapsed: z.number().nullable().describe('Elapsed minutes'),
      date: z.string().nullable().describe('Fixture date')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let sport = ctx.config.sport;
      let client = new Client({ token: ctx.auth.token, sport });

      let previousStatuses: Record<string, string> = ctx.state?.fixtureStatuses ?? {};
      let previouslyLive: Record<string, boolean> = ctx.state?.previouslyLive ?? {};

      let data: any;
      if (sport === 'football') {
        data = await client.getFootballFixtures({ live: 'all' });
      } else {
        data = await client.getLiveFixtures();
      }

      let currentStatuses: Record<string, string> = {};
      let currentlyLive: Record<string, boolean> = {};
      let inputs: any[] = [];

      let items = data.response ?? [];

      for (let item of items) {
        let isFootball = sport === 'football';
        let fixtureId = isFootball ? item.fixture?.id : item.id;
        if (!fixtureId) continue;

        let statusShort = isFootball
          ? (item.fixture?.status?.short ?? '')
          : (item.status?.short ?? '');
        let statusLong = isFootball
          ? (item.fixture?.status?.long ?? null)
          : (item.status?.long ?? null);

        let key = String(fixtureId);
        currentStatuses[key] = statusShort;
        currentlyLive[key] = true;

        let prevStatus = previousStatuses[key];

        if (prevStatus !== statusShort) {
          let changeType: string = 'status_changed';
          if (!prevStatus && ['1H', 'LIVE', 'Q1', 'P1', 'S1'].includes(statusShort)) {
            changeType = 'started';
          } else if (statusShort === 'HT') {
            changeType = 'halftime';
          } else if (statusShort === '2H') {
            changeType = 'second_half';
          } else if (statusShort === 'ET') {
            changeType = 'extra_time';
          } else if (statusShort === 'P' || statusShort === 'PEN') {
            changeType = 'penalties';
          } else if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(statusShort)) {
            changeType = 'finished';
          }

          let teams = isFootball ? (item.teams ?? {}) : (item.teams ?? {});
          let goals = isFootball ? (item.goals ?? {}) : (item.scores ?? {});

          inputs.push({
            fixtureId,
            homeTeamName: teams.home?.name ?? null,
            awayTeamName: teams.away?.name ?? null,
            homeTeamId: teams.home?.id ?? null,
            awayTeamId: teams.away?.id ?? null,
            leagueName: isFootball ? (item.league?.name ?? null) : (item.league?.name ?? null),
            leagueId: isFootball ? (item.league?.id ?? null) : (item.league?.id ?? null),
            statusShort,
            statusLong,
            homeScore: isFootball
              ? (goals.home ?? null)
              : (goals.home?.total ?? goals.home ?? null),
            awayScore: isFootball
              ? (goals.away ?? null)
              : (goals.away?.total ?? goals.away ?? null),
            elapsed: isFootball
              ? (item.fixture?.status?.elapsed ?? null)
              : (item.status?.timer ?? null),
            date: isFootball ? (item.fixture?.date ?? null) : (item.date ?? null),
            changeType
          });
        }
      }

      // Detect games that just finished (were live before, not live now)
      for (let [key, wasLive] of Object.entries(previouslyLive)) {
        if (wasLive && !currentlyLive[key] && previousStatuses[key]) {
          let prevStatus = previousStatuses[key]!;
          if (!['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(prevStatus)) {
            currentStatuses[key] = 'FT';
          }
        }
      }

      return {
        inputs,
        updatedState: {
          fixtureStatuses: { ...currentStatuses },
          previouslyLive: { ...currentlyLive }
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      return {
        type: `fixture.${input.changeType}`,
        id: `${input.fixtureId}-${input.statusShort}-${input.homeScore ?? 0}-${input.awayScore ?? 0}`,
        output: {
          fixtureId: input.fixtureId,
          homeTeamName: input.homeTeamName,
          awayTeamName: input.awayTeamName,
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId,
          leagueName: input.leagueName,
          leagueId: input.leagueId,
          statusShort: input.statusShort,
          statusLong: input.statusLong,
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          elapsed: input.elapsed,
          date: input.date
        }
      };
    }
  })
  .build();
