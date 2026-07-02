import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let predictTimeSeries = SlateTool.create(spec, {
  name: 'Predict Time Series',
  key: 'predict_time_series',
  description: `Forecast future values based on historical time series data. Provide a dataset of date-value pairs and get predicted future data points. Useful for trend analysis, demand forecasting, and financial projections.`,
  constraints: [
    'Dataset must contain 5-1000 data points.',
    'Steps range: 1-500 (default: 5).',
    'Dates must be in YYYY-MM-DD format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataset: z
        .array(
          z.object({
            date: z.string().describe('Date in YYYY-MM-DD format'),
            value: z
              .union([z.number(), z.string()])
              .describe('Numeric value for the data point')
          })
        )
        .describe('Historical data points (5-1000 entries)'),
      steps: z
        .number()
        .optional()
        .describe('Number of future data points to forecast (default: 5, max: 500)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      prediction: z
        .array(
          z.object({
            date: z.string().describe('Predicted date'),
            value: z.number().describe('Predicted value')
          })
        )
        .describe('Forecasted data points'),
      steps: z.number().describe('Number of predictions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let dataset = ctx.input.dataset
      .filter(point => point.value !== undefined)
      .map(point => ({
        date: point.date,
        value: point.value as string | number
      }));

    let result = await client.predict({
      dataset,
      steps: ctx.input.steps
    });

    return {
      output: {
        success: result.success,
        prediction: result.prediction,
        steps: result.steps
      },
      message: `Generated **${result.steps} predictions** from ${ctx.input.dataset.length} historical data points.`
    };
  })
  .build();
