import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getRecords, type ProviderResponse } from '../lib/client';
import { spec } from '../spec';

export let getPricePrediction = SlateTool.create(spec, {
  name: 'Get Price Predictions',
  key: 'get_price_prediction',
  description: `Retrieve provider-returned price forecasts and market-cap scenarios for crypto tokens. The price_prediction mode uses the documented price-prediction endpoint; scenario_analysis retains the legacy scenario-analysis route for existing workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      predictionType: z
        .enum(['price_prediction', 'scenario_analysis'])
        .describe('Type of prediction to retrieve'),
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, including pagination and original null values'),
      predictions: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of prediction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: ProviderResponse;

    if (ctx.input.predictionType === 'price_prediction') {
      result = await client.getPricePrediction({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    } else {
      result = await client.getScenarioAnalysis({
        tokenId: ctx.input.tokenId,
        symbol: ctx.input.symbol,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
    }

    let predictions = getRecords(result);

    return {
      output: { predictions, raw: result },
      message: `Retrieved **${predictions.length}** ${ctx.input.predictionType.replace('_', ' ')} record(s).`
    };
  })
  .build();
