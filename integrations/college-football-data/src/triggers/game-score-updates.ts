import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z.object({
  gameId: z.number().describe('Game ID'),
  homeTeam: z.string().describe('Home team name'),
  awayTeam: z.string().describe('Away team name'),
  homeScore: z.number().nullable().describe('Home team score'),
  awayScore: z.number().nullable().describe('Away team score'),
  status: z.string().describe('Game status (scheduled, in_progress, completed)'),
  period: z.number().nullable().optional().describe('Current game period/quarter'),
  clock: z.string().nullable().optional().describe('Game clock time remaining'),
  situation: z.string().nullable().optional().describe('Current game situation'),
  eventType: z
    .enum(['game.started', 'game.score_updated', 'game.completed'])
    .describe('Type of event detected')
});

type GameScoreInput = z.infer<typeof inputSchema>;

export let gameScoreUpdates = SlateTrigger.create(spec, {
  name: 'Game Score Updates',
  key: 'game_score_updates',
  description:
    'Polls the live scoreboard for game status changes and score updates. Triggers when games start, scores change, or games are completed.'
})
  .input(inputSchema)
  .output(
    z.object({
      gameId: z.number().describe('Game ID'),
      homeTeam: z.string().describe('Home team name'),
      awayTeam: z.string().describe('Away team name'),
      homeScore: z.number().nullable().describe('Home team score'),
      awayScore: z.number().nullable().describe('Away team score'),
      status: z.string().describe('Game status'),
      period: z.number().nullable().optional().describe('Current game period/quarter'),
      clock: z.string().nullable().optional().describe('Game clock'),
      situation: z.string().nullable().optional().describe('Current game situation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let scoreboard = await client.getScoreboard();

      let previousState: Record<
        string,
        { homeScore: number | null; awayScore: number | null; status: string }
      > = ctx.state?.gameStates ?? {};
      let inputs: GameScoreInput[] = [];
      let newState: Record<
        string,
        { homeScore: number | null; awayScore: number | null; status: string }
      > = {};

      if (Array.isArray(scoreboard)) {
        for (let game of scoreboard) {
          let gameId = game.id;
          let homeScore = game.homeScore ?? game.homePoints ?? null;
          let awayScore = game.awayScore ?? game.awayPoints ?? null;
          let status = game.status ?? 'scheduled';
          let homeTeam = game.homeTeam?.name ?? game.homeTeam ?? 'Unknown';
          let awayTeam = game.awayTeam?.name ?? game.awayTeam ?? 'Unknown';
          let period = game.period ?? null;
          let clock = game.clock ?? null;
          let situation = game.situation ?? null;

          newState[String(gameId)] = { homeScore, awayScore, status };

          let prev = previousState[String(gameId)];

          if (!prev && status === 'in_progress') {
            inputs.push({
              gameId,
              homeTeam,
              awayTeam,
              homeScore,
              awayScore,
              status,
              period,
              clock,
              situation,
              eventType: 'game.started' as const
            });
          } else if (prev) {
            if (prev.status !== 'completed' && status === 'completed') {
              inputs.push({
                gameId,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                status,
                period,
                clock,
                situation,
                eventType: 'game.completed' as const
              });
            } else if (prev.homeScore !== homeScore || prev.awayScore !== awayScore) {
              inputs.push({
                gameId,
                homeTeam,
                awayTeam,
                homeScore,
                awayScore,
                status,
                period,
                clock,
                situation,
                eventType: 'game.score_updated' as const
              });
            }
          }
        }
      }

      return {
        inputs,
        updatedState: { gameStates: newState }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.gameId}-${ctx.input.eventType}-${ctx.input.homeScore}-${ctx.input.awayScore}`,
        output: {
          gameId: ctx.input.gameId,
          homeTeam: ctx.input.homeTeam,
          awayTeam: ctx.input.awayTeam,
          homeScore: ctx.input.homeScore,
          awayScore: ctx.input.awayScore,
          status: ctx.input.status,
          period: ctx.input.period,
          clock: ctx.input.clock,
          situation: ctx.input.situation
        }
      };
    }
  })
  .build();
