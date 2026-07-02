import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scoreEntrySchema = z.object({
  name: z.string().describe('Team or participant name'),
  score: z.string().describe('Current score value')
});

export let scoreUpdatesTrigger = SlateTrigger.create(spec, {
  name: 'Score Updates',
  key: 'score_updates',
  description:
    'Polls for game score changes and completions for a given sport. Detects when games start, scores change, or games complete.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      sportKey: z.string().describe('Sport key'),
      sportTitle: z.string().describe('Sport display name'),
      commenceTime: z.string().describe('ISO timestamp of event start time'),
      homeTeam: z.string().nullable().describe('Home team name'),
      awayTeam: z.string().nullable().describe('Away team name'),
      completed: z.boolean().describe('Whether the game has completed'),
      scores: z.array(scoreEntrySchema).nullable().describe('Current scores'),
      lastUpdate: z.string().nullable().describe('ISO timestamp of last score update'),
      changeType: z
        .enum(['started', 'score_changed', 'completed'])
        .describe('Type of score change detected')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      sportKey: z.string().describe('Sport key'),
      sportTitle: z.string().describe('Sport display name'),
      commenceTime: z.string().describe('ISO timestamp of event start time'),
      homeTeam: z.string().nullable().describe('Home team name'),
      awayTeam: z.string().nullable().describe('Away team name'),
      completed: z.boolean().describe('Whether the game has completed'),
      scores: z.array(scoreEntrySchema).nullable().describe('Current scores for each team'),
      lastUpdate: z.string().nullable().describe('ISO timestamp of last score update')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let sport = (ctx.state as Record<string, unknown>)?.sport as string | undefined;
      if (!sport) {
        sport = 'upcoming';
      }

      let client = new Client({ token: ctx.auth.token });
      let events = await client.getScores({ sport, daysFrom: 1 });

      let previousScores =
        ((ctx.state as Record<string, unknown>)?.scoreMap as
          | Record<string, string>
          | undefined) ?? {};
      let previousCompleted =
        ((ctx.state as Record<string, unknown>)?.completedSet as string[] | undefined) ?? [];
      let completedSet = new Set(previousCompleted);

      let inputs: Array<{
        eventId: string;
        sportKey: string;
        sportTitle: string;
        commenceTime: string;
        homeTeam: string | null;
        awayTeam: string | null;
        completed: boolean;
        scores: Array<{ name: string; score: string }> | null;
        lastUpdate: string | null;
        changeType: 'started' | 'score_changed' | 'completed';
      }> = [];

      let newScoreMap: Record<string, string> = {};

      for (let event of events) {
        if (!event.scores) continue;

        let scoreKey = event.scores.map(s => `${s.name}:${s.score}`).join('|');
        newScoreMap[event.id] = scoreKey;

        let prevScore = previousScores[event.id];

        if (prevScore === undefined) {
          inputs.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            commenceTime: event.commence_time,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            completed: event.completed,
            scores: event.scores,
            lastUpdate: event.last_update,
            changeType: 'started'
          });
        } else if (scoreKey !== prevScore) {
          inputs.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            commenceTime: event.commence_time,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            completed: event.completed,
            scores: event.scores,
            lastUpdate: event.last_update,
            changeType:
              event.completed && !completedSet.has(event.id) ? 'completed' : 'score_changed'
          });
        } else if (event.completed && !completedSet.has(event.id)) {
          inputs.push({
            eventId: event.id,
            sportKey: event.sport_key,
            sportTitle: event.sport_title,
            commenceTime: event.commence_time,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            completed: event.completed,
            scores: event.scores,
            lastUpdate: event.last_update,
            changeType: 'completed'
          });
        }
      }

      let newCompletedSet = events.filter(e => e.completed).map(e => e.id);

      return {
        inputs,
        updatedState: {
          sport,
          scoreMap: newScoreMap,
          completedSet: newCompletedSet
        }
      };
    },

    handleEvent: async ctx => {
      let { changeType, eventId, ...rest } = ctx.input;
      let dedupeId = `${eventId}-${changeType}-${rest.lastUpdate ?? rest.commenceTime}`;

      return {
        type: `score.${changeType}`,
        id: dedupeId,
        output: {
          eventId,
          ...rest
        }
      };
    }
  })
  .build();
