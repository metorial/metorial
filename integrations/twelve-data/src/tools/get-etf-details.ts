import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getEtfDetails = SlateTool.create(spec, {
  name: 'Get ETF Details',
  key: 'get_etf_details',
  description: `Retrieve detailed ETF information including profile data and top holdings.
Use this to analyze ETF composition, expense ratios, assets under management, and underlying holdings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('ETF ticker symbol (e.g., "SPY", "QQQ", "VTI")'),
      exchange: z.string().optional().describe('Exchange where the ETF is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      includeHoldings: z
        .boolean()
        .optional()
        .describe('Whether to include holdings data (default: true)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('ETF ticker symbol'),
      profile: z
        .record(z.string(), z.any())
        .optional()
        .describe('ETF profile including name, expense ratio, AUM, and other metadata'),
      holdings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of ETF holdings with weights')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let baseParams = {
      symbol: ctx.input.symbol,
      exchange: ctx.input.exchange,
      country: ctx.input.country
    };

    let includeHoldings = ctx.input.includeHoldings !== false;

    let [profileResult, holdingsResult] = await Promise.all([
      client.getEtfProfile(baseParams).catch(() => null),
      includeHoldings
        ? client.getEtfHoldings(baseParams).catch(() => null)
        : Promise.resolve(null)
    ]);

    let holdings = holdingsResult?.holdings || [];

    return {
      output: {
        symbol: ctx.input.symbol,
        profile: profileResult || undefined,
        holdings: includeHoldings ? holdings : undefined
      },
      message: `Retrieved ETF details for **${ctx.input.symbol}**${holdings.length ? ` with **${holdings.length}** holdings` : ''}.`
    };
  })
  .build();
