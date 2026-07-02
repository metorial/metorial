import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outputParameterEnum = z
  .enum([
    'ghi',
    'dni',
    'dhi',
    'ebh',
    'gti',
    'clearsky_ghi',
    'clearsky_dni',
    'clearsky_dhi',
    'air_temp',
    'dewpoint_temp',
    'surface_pressure',
    'wind_speed_10m',
    'wind_speed_100m',
    'wind_direction_10m',
    'wind_direction_100m',
    'relative_humidity',
    'precipitation_rate',
    'snow_depth',
    'snow_water_equivalent',
    'cloud_opacity',
    'pm2.5',
    'pm10',
    'albedo_daily'
  ])
  .describe('Output parameter to include');

let dataPointSchema = z
  .record(z.string(), z.any())
  .describe('Time-series data point with period_end, period, and requested output parameters');

export let getRadiationAndWeather = SlateTool.create(spec, {
  name: 'Get Radiation & Weather',
  key: 'get_radiation_and_weather',
  description: `Retrieve solar irradiance and weather data for any global location. Supports three temporal modes:
- **Forecast**: Up to 14 days ahead from the present time
- **Live**: Estimated actuals for the past 7 days to present
- **Historic**: Time series from 2007 to 7 days ago

Returns time-series data including GHI, DNI, DHI, GTI, air temperature, wind speed, cloud opacity, precipitation, and more. Select specific output parameters to customize the response.`,
  instructions: [
    'Use mode "forecast" for future projections, "live" for recent estimated actuals, and "historic" for long-term past data.',
    'For historic mode, the "start" parameter is required. The duration must be within 31 days.',
    'Use outputParameters to select specific data fields. If omitted, default parameters are returned.',
    'The period parameter controls time resolution: PT5M, PT10M, PT15M, PT30M, or PT60M.'
  ],
  constraints: [
    'Historic duration must be within 31 days per request.',
    'Latitude must be between -90 and 90, longitude between -180 and 180.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['forecast', 'live', 'historic'])
        .describe(
          'Temporal mode: forecast (future), live (recent estimated actuals), or historic (past data from 2007)'
        ),
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe('Latitude in decimal degrees (north positive)'),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe('Longitude in decimal degrees (east positive)'),
      outputParameters: z
        .array(outputParameterEnum)
        .optional()
        .describe('Specific output parameters to include in the response'),
      period: z
        .enum(['PT5M', 'PT10M', 'PT15M', 'PT30M', 'PT60M'])
        .optional()
        .describe('Time resolution for the data'),
      hours: z.number().optional().describe('Number of hours of data to return'),
      tilt: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Fixed tilt angle of the surface in degrees'),
      azimuth: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Azimuth angle of the surface (-180 to 180, north=0, east=90)'),
      arrayType: z
        .enum(['fixed', 'horizontal_single_axis'])
        .optional()
        .describe('Array mounting type'),
      terrainShading: z.boolean().optional().describe('Apply terrain shading to the results'),
      start: z
        .string()
        .optional()
        .describe(
          'Start datetime for historic mode (ISO 8601 format, e.g. 2024-01-01T00:00Z)'
        ),
      end: z.string().optional().describe('End datetime for historic mode (ISO 8601 format)'),
      duration: z
        .string()
        .optional()
        .describe('ISO 8601 duration for historic mode (e.g. P7D for 7 days)'),
      timeZone: z
        .string()
        .optional()
        .describe(
          'Time zone for historic response timestamps (e.g. UTC, or a fixed offset like +10:00)'
        )
    })
  )
  .output(
    z.object({
      dataPoints: z.array(dataPointSchema).describe('Array of time-series data points'),
      count: z.number().describe('Number of data points returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      mode,
      latitude,
      longitude,
      outputParameters,
      period,
      hours,
      tilt,
      azimuth,
      arrayType,
      terrainShading,
      start,
      end,
      duration,
      timeZone
    } = ctx.input;

    let baseParams = {
      latitude,
      longitude,
      outputParameters,
      period,
      hours,
      tilt,
      azimuth,
      arrayType,
      terrainShading
    };
    let result: any;

    if (mode === 'forecast') {
      result = await client.getForecastRadiationAndWeather(baseParams);
    } else if (mode === 'live') {
      result = await client.getLiveRadiationAndWeather(baseParams);
    } else {
      if (!start) {
        throw new Error('The "start" parameter is required for historic mode.');
      }
      result = await client.getHistoricRadiationAndWeather({
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
      message: `Retrieved **${dataPoints.length}** ${mode} radiation and weather data points for location (${latitude}, ${longitude}).`
    };
  })
  .build();
