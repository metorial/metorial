import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z.object({
  gameId: z.number().describe('Game ID'),
  homeTeam: z.string().describe('Home team name'),
  awayTeam: z.string().describe('Away team name'),
  lines: z.array(z.any()).describe('Array of betting lines from various sportsbooks'),
  eventType: z.enum(['betting.new_lines', 'betting.lines_updated']).describe('Type of event')
});

type BettingLineInput = z.infer<typeof inputSchema>;

export let bettingLineUpdates = SlateTrigger.create(spec, {
  name: 'Betting Line Updates',
  key: 'betting_line_updates',
  description:
    'Polls for new or changed betting lines (spread, over/under, moneyline) on college football games for a given year and week. Triggers when new lines are detected or existing lines change.'
})
  .input(inputSchema)
  .output(
    z.object({
      gameId: z.number().describe('Game ID'),
      homeTeam: z.string().describe('Home team name'),
      awayTeam: z.string().describe('Away team name'),
      lines: z.array(z.any()).describe('Current betting lines from sportsbooks')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let currentYear = new Date().getFullYear();
      let bettingGames = await client.getBettingLines({ year: currentYear });

      let previousState: Record<string, string> = ctx.state?.lineHashes ?? {};
      let inputs: BettingLineInput[] = [];
      let newState: Record<string, string> = {};

      if (Array.isArray(bettingGames)) {
        for (let game of bettingGames) {
          let gameId = game.id;
          let lines = game.lines ?? [];
          let lineHash = JSON.stringify(lines);
          let homeTeam = game.homeTeam ?? 'Unknown';
          let awayTeam = game.awayTeam ?? 'Unknown';

          newState[String(gameId)] = lineHash;

          let prev = previousState[String(gameId)];

          if (!prev && lines.length > 0) {
            inputs.push({
              gameId,
              homeTeam,
              awayTeam,
              lines,
              eventType: 'betting.new_lines' as const
            });
          } else if (prev && prev !== lineHash) {
            inputs.push({
              gameId,
              homeTeam,
              awayTeam,
              lines,
              eventType: 'betting.lines_updated' as const
            });
          }
        }
      }

      return {
        inputs,
        updatedState: { lineHashes: newState }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.gameId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          gameId: ctx.input.gameId,
          homeTeam: ctx.input.homeTeam,
          awayTeam: ctx.input.awayTeam,
          lines: ctx.input.lines
        }
      };
    }
  })
  .build();
