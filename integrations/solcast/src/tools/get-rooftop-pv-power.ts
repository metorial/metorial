import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dataPointSchema = z
  .record(z.string(), z.any())
  .describe('Time-series data point with period_end, period, and PV power estimates');

export let getRooftopPvPower = SlateTool.create(spec, {
  name: 'Get Rooftop PV Power',
  key: 'get_rooftop_pv_power',
  description: `Estimate PV power output for a rooftop solar system at any global location. Designed for modelling production from rooftop PV systems (particularly fleets) with limited system specifications.

Supports three temporal modes:
- **Forecast**: Power output predictions up to 14 days ahead
- **Live**: Estimated actual power output for the past 7 days
- **Historic**: Historical power output from 2007 to 7 days ago`,
  instructions: [
    'Provide the system capacity in kW along with the location.',
    'Tilt and azimuth define the panel orientation. Azimuth: north=0, east=90.',
    'For historic mode, the "start" parameter is required. Duration must be within 31 days.'
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
      latitude: z.number().min(-90).max(90).describe('Latitude in decimal degrees'),
      longitude: z.number().min(-180).max(180).describe('Longitude in decimal degrees'),
      capacity: z.number().positive().describe('System capacity in kW'),
      tilt: z
        .number()
        .min(0)
        .max(90)
        .optional()
        .describe('Panel tilt angle in degrees from horizontal'),
      azimuth: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Panel azimuth angle (-180 to 180, north=0, east=90)'),
      installDate: z
        .string()
        .optional()
        .describe('Installation date (ISO 8601 date format, e.g. 2020-01-15)'),
      lossFactor: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Loss factor (0 to 1) accounting for system losses'),
      outputParameters: z
        .array(z.string())
        .optional()
        .describe('Specific output parameters to include'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution'),
      hours: z.number().optional().describe('Number of hours of data to return'),
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
      latitude,
      longitude,
      capacity,
      tilt,
      azimuth,
      installDate,
      lossFactor,
      outputParameters,
      period,
      hours,
      terrainShading,
      start,
      end,
      duration,
      timeZone
    } = ctx.input;

    let baseParams = {
      latitude,
      longitude,
      capacity,
      tilt,
      azimuth,
      installDate,
      lossFactor,
      outputParameters,
      period,
      hours,
      terrainShading
    };
    let result: any;

    if (mode === 'forecast') {
      result = await client.getForecastRooftopPvPower(baseParams);
    } else if (mode === 'live') {
      result = await client.getLiveRooftopPvPower(baseParams);
    } else {
      if (!start) {
        throw new Error('The "start" parameter is required for historic mode.');
      }
      result = await client.getHistoricRooftopPvPower({
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
      message: `Retrieved **${dataPoints.length}** ${mode} rooftop PV power data points for a ${capacity} kW system at (${latitude}, ${longitude}).`
    };
  })
  .build();
