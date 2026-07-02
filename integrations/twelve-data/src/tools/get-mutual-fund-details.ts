import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getMutualFundDetails = SlateTool.create(spec, {
  name: 'Get Mutual Fund Details',
  key: 'get_mutual_fund_details',
  description: `Retrieve detailed mutual fund information including profile data and top holdings.
Use this to analyze mutual fund composition, expense ratios, and underlying holdings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Mutual fund ticker symbol (e.g., "VFIAX", "FXAIX")'),
      exchange: z.string().optional().describe('Exchange where the fund is listed'),
      country: z.string().optional().describe('Country of the exchange'),
      includeHoldings: z
        .boolean()
        .optional()
        .describe('Whether to include holdings data (default: true)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Mutual fund ticker symbol'),
      profile: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fund profile including name, expense ratio, and other metadata'),
      holdings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of fund holdings with weights')
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
      client.getMutualFundProfile(baseParams).catch(() => null),
      includeHoldings
        ? client.getMutualFundHoldings(baseParams).catch(() => null)
        : Promise.resolve(null)
    ]);

    let holdings = holdingsResult?.holdings || [];

    return {
      output: {
        symbol: ctx.input.symbol,
        profile: profileResult || undefined,
        holdings: includeHoldings ? holdings : undefined
      },
      message: `Retrieved mutual fund details for **${ctx.input.symbol}**${holdings.length ? ` with **${holdings.length}** holdings` : ''}.`
    };
  })
  .build();
