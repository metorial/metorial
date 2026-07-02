import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalystData = SlateTool.create(spec, {
  name: 'Get Analyst Data',
  key: 'get_analyst_data',
  description: `Retrieve analyst price targets and revenue estimates for a company.
Includes consensus target prices (high, low, median, average) and revenue forecast data from analyst expectations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT", "TSLA")'),
      dataType: z
        .enum(['price_target', 'revenue_estimates', 'both'])
        .describe('Type of analyst data to retrieve'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      priceTarget: z
        .object({
          high: z.string().optional().describe('Highest analyst price target'),
          low: z.string().optional().describe('Lowest analyst price target'),
          median: z.string().optional().describe('Median analyst price target'),
          average: z.string().optional().describe('Average analyst price target')
        })
        .optional()
        .describe('Analyst price target consensus'),
      revenueEstimates: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Revenue estimate records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let baseParams = {
      symbol: ctx.input.symbol,
      exchange: ctx.input.exchange,
      country: ctx.input.country
    };

    let priceTarget: any;
    let revenueEstimates: any[] | undefined;

    if (ctx.input.dataType === 'price_target' || ctx.input.dataType === 'both') {
      let ptResult = await client.getPriceTarget(baseParams);
      priceTarget = {
        high: ptResult.price_target?.high || ptResult.high,
        low: ptResult.price_target?.low || ptResult.low,
        median: ptResult.price_target?.median || ptResult.median,
        average: ptResult.price_target?.average || ptResult.average
      };
    }

    if (ctx.input.dataType === 'revenue_estimates' || ctx.input.dataType === 'both') {
      let reResult = await client.getRevenueEstimates(baseParams);
      revenueEstimates = reResult.revenue_estimate || reResult.revenue_estimates || [];
      if (!Array.isArray(revenueEstimates)) {
        revenueEstimates = [revenueEstimates];
      }
    }

    let parts: string[] = [];
    if (priceTarget) {
      parts.push(
        `Price target: avg **${priceTarget.average}**, range ${priceTarget.low}–${priceTarget.high}`
      );
    }
    if (revenueEstimates) {
      parts.push(`${revenueEstimates.length} revenue estimate(s)`);
    }

    return {
      output: {
        symbol: ctx.input.symbol,
        priceTarget,
        revenueEstimates
      },
      message: `Analyst data for **${ctx.input.symbol}**: ${parts.join('. ')}.`
    };
  })
  .build();
