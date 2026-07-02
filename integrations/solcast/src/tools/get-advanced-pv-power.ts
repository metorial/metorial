import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dataPointSchema = z
  .record(z.string(), z.any())
  .describe('Time-series data point with period_end, period, and PV power estimates');

export let getAdvancedPvPower = SlateTool.create(spec, {
  name: 'Get Advanced PV Power',
  key: 'get_advanced_pv_power',
  description: `Retrieve advanced PV power estimates for a pre-configured PV Power Site. Uses Solcast's sophisticated PV model with comprehensive site configuration options including tracking type, bifacial settings, derating factors, and more.

Supports three temporal modes:
- **Forecast**: Power output predictions up to 14 days ahead
- **Live**: Estimated actual power output for the past 7 days
- **Historic**: Historical power output from 2007 to 7 days ago

Requires a PV Power Site to be created first using the "Manage PV Power Site" tool.`,
  instructions: [
    "A PV Power Site must be created before using this tool. Use the site's resourceId.",
    'Operational adjustments (snow soiling, dust soiling, constraints, availability) can be toggled on/off.',
    'For historic mode, "start" is required. Duration must be within 31 days.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['forecast', 'live', 'historic'])
        .describe('Temporal mode: forecast, live, or historic'),
      resourceId: z.string().describe('Resource ID of the PV Power Site'),
      outputParameters: z
        .array(z.string())
        .optional()
        .describe('Specific output parameters to include'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution'),
      hours: z.number().optional().describe('Number of hours of data to return'),
      applyAvailability: z
        .boolean()
        .optional()
        .describe('Apply reduced availability adjustments'),
      applyConstraint: z
        .boolean()
        .optional()
        .describe('Apply constraint/curtailment adjustments'),
      applyDustSoiling: z.boolean().optional().describe('Apply dust soiling losses'),
      applySnowSoiling: z.boolean().optional().describe('Apply snow soiling losses'),
      applyTrackerInactive: z
        .boolean()
        .optional()
        .describe('Apply inactive tracker adjustments'),
      terrainShading: z.boolean().optional().describe('Apply terrain shading'),
      start: z.string().optional().describe('Start datetime for historic mode (ISO 8601)'),
      end: z.string().optional().describe('End datetime for historic mode (ISO 8601)'),
      duration: z
        .string()
        .optional()
        .describe('ISO 8601 duration for historic mode (e.g. P7D)'),
      timeZone: z.string().optional().describe('Time zone for historic timestamps')
    })
  )
  .output(
    z.object({
      dataPoints: z
        .array(dataPointSchema)
        .describe('Array of time-series PV power data points'),
      count: z.number().describe('Number of data points returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      mode,
      resourceId,
      outputParameters,
      period,
      hours,
      applyAvailability,
      applyConstraint,
      applyDustSoiling,
      applySnowSoiling,
      applyTrackerInactive,
      terrainShading,
      start,
      end,
      duration,
      timeZone
    } = ctx.input;

    let baseParams = {
      resourceId,
      outputParameters,
      period,
      hours,
      applyAvailability,
      applyConstraint,
      applyDustSoiling,
      applySnowSoiling,
      applyTrackerInactive,
      terrainShading
    };
    let result: any;

    if (mode === 'forecast') {
      result = await client.getForecastAdvancedPvPower(baseParams);
    } else if (mode === 'live') {
      result = await client.getLiveAdvancedPvPower(baseParams);
    } else {
      if (!start) {
        throw new Error('The "start" parameter is required for historic mode.');
      }
      result = await client.getHistoricAdvancedPvPower({
        ...baseParams,
        start,
        end,
        duration,
        timeZone
      });
    }

    let dataKey = mode === 'forecast' ? 'forecasts' : 'estimated_actuals';
    let dataPoints = result[dataKey] ?? result.estimated_actuals ?? result.forecasts ?? [];

    return {
      output: {
        dataPoints,
        count: dataPoints.length
      },
      message: `Retrieved **${dataPoints.length}** ${mode} advanced PV power data points for site \`${resourceId}\`.`
    };
  })
  .build();
