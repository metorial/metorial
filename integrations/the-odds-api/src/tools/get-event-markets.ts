import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventMarketsSchema, mapEventMarkets } from '../lib/schemas';
import { spec } from '../spec';

export let getEventMarketsTool = SlateTool.create(spec, {
  name: 'Get Event Markets',
  key: 'get_event_markets',
  description: `Discover which market keys each bookmaker has recently offered for a specific event. Useful for finding available player props and secondary markets before requesting full odds data with the **Get Event Odds** tool.`,
  constraints: ['Costs 1 API credit.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z.string().describe('Sport key from list_sports (e.g. "basketball_nba")'),
      eventId: z.string().describe('Event ID from get_events or get_odds'),
      regions: z.string().describe('Comma-separated bookmaker regions: us, us2, uk, au, eu'),
      bookmakers: z.string().optional().describe('Comma-separated bookmaker keys to filter')
    })
  )
  .output(eventMarketsSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { sport, eventId, regions, bookmakers } = ctx.input;

    let e = await client.getEventMarkets({
      sport,
      eventId,
      regions,
      bookmakers
    });

    let result = mapEventMarkets(e);

    let totalMarkets = result.bookmakers.reduce((sum, b) => sum + b.markets.length, 0);

    return {
      output: result,
      message: `Found **${totalMarkets}** market offerings across **${result.bookmakers.length}** bookmakers for event ${eventId}.`
    };
  })
  .build();
