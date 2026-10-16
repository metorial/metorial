import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventWithOddsSchema, mapEventWithOdds } from '../lib/schemas';
import { spec } from '../spec';

export let getEventOddsTool = SlateTool.create(spec, {
  name: 'Get Event Odds',
  key: 'get_event_odds',
  description: `Retrieve odds for a single event across all available markets and bookmakers. Supports extended markets including player props (e.g. player points, passing touchdowns), alternate spreads/totals, and period-specific markets.
Use the **Get Event Markets** tool first to discover which market keys are available.`,
  instructions: [
    'Use event IDs from the Get Events or Get Odds tools.',
    'Market keys for player props vary by sport (e.g. "player_pass_tds", "player_points").',
    'Multiple markets can be comma-separated.'
  ],
  constraints: ['Costs 1 credit per unique market returned per region.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key from list_sports (e.g. "americanfootball_nfl")'),
      eventId: z.string().describe('Event ID from get_events or get_odds'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      markets: z
        .string()
        .optional()
        .describe('Comma-separated market keys (e.g. "h2h,spreads,player_pass_tds")'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format (default: decimal)'),
      includeLinks: z
        .boolean()
        .optional()
        .describe('Include bookmaker event, market and selection links when available'),
      includeSids: z
        .boolean()
        .optional()
        .describe('Include bookmaker source identifiers when available'),
      includeBetLimits: z
        .boolean()
        .optional()
        .describe('Include selection bet limits when available'),
      includeRotationNumbers: z
        .boolean()
        .optional()
        .describe('Include home and away rotation numbers when available'),
      bookmakers: z
        .string()
        .optional()
        .describe('Comma-separated bookmaker keys to filter; takes priority over regions')
    })
  )
  .output(eventWithOddsSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, eventId, regions, markets, oddsFormat, bookmakers } = ctx.input;

    let e = await client.getEventOdds({
      includeLinks: ctx.input.includeLinks,
      includeSids: ctx.input.includeSids,
      includeBetLimits: ctx.input.includeBetLimits,
      includeRotationNumbers: ctx.input.includeRotationNumbers,
      sport,
      eventId,
      regions,
      markets,
      oddsFormat,
      bookmakers
    });

    let result = mapEventWithOdds(e);

    let matchup = e.home_team && e.away_team ? `${e.home_team} vs ${e.away_team}` : eventId;

    return {
      output: result,
      message: `Retrieved odds for **${matchup}** from **${result.bookmakers.length}** bookmakers.`
    };
  })
  .build();
