import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getDataPoints } from '../lib/client';
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
    'Use availabilityPercent, constraintPowerMw, dustSoilingLoss, and snowSoilingLoss for numeric operational overrides. Legacy constraint flags do not remove configured site export limits.',
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
      resourceId: z
        .string()
        .describe(
          'Resource ID of the PV Power Site. Use list_pv_power_sites to discover sites.'
        ),
      outputParameters: z
        .array(z.string())
        .optional()
        .describe('Specific output parameters to include'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT20M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution'),
      hours: z.number().optional().describe('Number of hours of data to return'),
      availabilityPercent: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe(
          'Availability override as a percentage of AC capacity (0 to 100); takes precedence over applyAvailability'
        ),
      constraintPowerMw: z
        .number()
        .min(0)
        .optional()
        .describe('Optional AC power cap in MW; configured site export limits still apply'),
      dustSoilingLoss: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Dust soiling loss fraction (0 to 1); takes precedence over applyDustSoiling'
        ),
      snowSoilingLoss: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'Snow soiling loss fraction (0 to 1); takes precedence over applySnowSoiling'
        ),
      applyAvailability: z
        .boolean()
        .optional()
        .describe(
          'Use default availability when true; false requests 100% availability unless availabilityPercent is provided'
        ),
      applyConstraint: z
        .boolean()
        .optional()
        .describe(
          'Legacy flag retained for compatibility; use constraintPowerMw for an explicit cap. Configured site limits remain active'
        ),
      applyDustSoiling: z
        .boolean()
        .optional()
        .describe(
          'Use default dust soiling when true; false requests zero dust loss unless dustSoilingLoss is provided'
        ),
      applySnowSoiling: z
        .boolean()
        .optional()
        .describe(
          'Use default snow soiling when true; false requests zero snow loss unless snowSoilingLoss is provided'
        ),
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
      availabilityPercent,
      constraintPowerMw,
      dustSoilingLoss,
      snowSoilingLoss,
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
      availabilityPercent,
      constraintPowerMw,
      dustSoilingLoss,
      snowSoilingLoss,
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
        throw createApiServiceError('The "start" parameter is required for historic mode.');
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
    let dataPoints = getDataPoints(result, dataKey);

    return {
      output: {
        dataPoints,
        count: dataPoints.length
      },
      message: `Retrieved **${dataPoints.length}** ${mode} advanced PV power data points for site \`${resourceId}\`.`
    };
  })
  .build();
