import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dataPointSchema = z.record(z.string(), z.any()).describe('Grid aggregation data point');

export let getGridAggregations = SlateTool.create(spec, {
  name: 'Get Grid Aggregations',
  key: 'get_grid_aggregations',
  description: `Retrieve aggregated PV power data for grid regions or PV fleets. Grid aggregations combine thousands of PV systems into regional power estimates.

Supports two modes:
- **Live**: Estimated actual aggregated power for up to 7 days
- **Forecast**: Forecasted aggregated power for up to 7 days

Outputs include total power (MW) or performance units (% of capacity), with probabilistic outputs (P10/P50/P90). Used for grid management, load forecasting, VPP management, and energy trading.`,
  instructions: [
    'Aggregations must be pre-configured by the Solcast team. Provide the collectionId or aggregationId.',
    'Contact Solcast to set up custom grid aggregations based on your PV fleet metadata.'
  ],
  constraints: [
    'Grid aggregation setup is not self-service — it requires contacting Solcast directly.',
    'Data is available for up to 7 days in both live and forecast modes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['live', 'forecast'])
        .describe('Live (estimated actuals) or forecast (future projections)'),
      collectionId: z.string().optional().describe('Collection ID for the grid aggregation'),
      aggregationId: z
        .string()
        .optional()
        .describe('Aggregation ID for a specific aggregation'),
      outputParameters: z
        .array(z.string())
        .optional()
        .describe('Specific output parameters to include'),
      hours: z.number().optional().describe('Number of hours of data to return'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution')
    })
  )
  .output(
    z.object({
      dataPoints: z.array(dataPointSchema).describe('Array of aggregated power data points'),
      count: z.number().describe('Number of data points returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { mode, collectionId, aggregationId, outputParameters, hours, period } = ctx.input;

    let params = { collectionId, aggregationId, outputParameters, hours, period };
    let result: any;

    if (mode === 'live') {
      result = await client.getLiveAggregations(params);
    } else {
      result = await client.getForecastAggregations(params);
    }

    let dataPoints = result.forecasts ?? result.estimated_actuals ?? [];

    return {
      output: {
        dataPoints,
        count: dataPoints.length
      },
      message: `Retrieved **${dataPoints.length}** ${mode} grid aggregation data points.`
    };
  })
  .build();
