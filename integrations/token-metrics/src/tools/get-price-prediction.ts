import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPricePrediction = SlateTool.create(spec, {
  name: 'Get Price Predictions',
  key: 'get_price_prediction',
  description: `Retrieve AI-powered price predictions and scenario analysis for crypto tokens. Supports two modes:
- **Price Prediction**: Direct price forecasts based on AI models.
- **Scenario Analysis**: Detailed scenario-based analysis with base, bear, and moon case predictions including predicted prices, market caps, FDV, and ROI.`,
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
      predictions: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of prediction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

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

    let predictions = result?.data ?? [];

    return {
      output: { predictions },
      message: `Retrieved **${predictions.length}** ${ctx.input.predictionType.replace('_', ' ')} record(s).`
    };
  })
  .build();
