import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapEventWithOdds, sportOddsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getOddsTool = SlateTool.create(spec, {
  name: 'Get Odds',
  key: 'get_odds',
  description: `Retrieve live and upcoming betting odds for a given sport. Returns events with bookmaker odds for the specified regions and markets.
Use \`"upcoming"\` as the sport to get live games and the next eight upcoming games across all sports.`,
  instructions: [
    'Use sport keys from the List Sports tool (e.g. "americanfootball_nfl", "soccer_epl").',
    'Specify at least one region. Multiple regions can be comma-separated (e.g. "us,uk").',
    'Markets default to "h2h" (moneyline), or "outrights" for futures sports. Available: h2h, spreads, totals, outrights.'
  ],
  constraints: ['Costs 1 API credit per region per market.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z
        .string()
        .describe(
          'Sport key from list_sports (e.g. "americanfootball_nfl") or "upcoming" for all sports'
        ),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      markets: z
        .string()
        .optional()
        .describe('Comma-separated markets: h2h, spreads, totals, outrights (default: h2h)'),
      oddsFormat: z
        .enum(['decimal', 'american'])
        .optional()
        .describe('Odds format (default: decimal)'),
      eventIds: z.string().optional().describe('Comma-separated event IDs to filter'),
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
        .describe('Comma-separated bookmaker keys to filter; takes priority over regions'),
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
      events: z.array(sportOddsSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      sport,
      regions,
      markets,
      oddsFormat,
      eventIds,
      bookmakers,
      commenceTimeFrom,
      commenceTimeTo
    } = ctx.input;

    let data = await client.getOdds({
      includeLinks: ctx.input.includeLinks,
      includeSids: ctx.input.includeSids,
      includeBetLimits: ctx.input.includeBetLimits,
      includeRotationNumbers: ctx.input.includeRotationNumbers,
      sport,
      regions,
      markets,
      oddsFormat,
      eventIds,
      bookmakers,
      commenceTimeFrom,
      commenceTimeTo
    });

    let events = data.map(event => mapEventWithOdds(event));

    return {
      output: { events },
      message: `Retrieved odds for **${events.length}** events in **${sport}** from regions: ${regions}.`
    };
  })
  .build();
