import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let forecastEntrySchema = z
  .object({
    time: z.number().optional().describe('Timestamp'),
    temperature: z.number().optional().describe('Temperature'),
    apparentTemperature: z.number().optional().describe('Feels-like temperature'),
    summary: z.string().optional().describe('Weather summary'),
    icon: z.string().optional().describe('Weather icon'),
    dewPoint: z.number().optional().describe('Dew point'),
    humidity: z.number().optional().describe('Humidity (0-1)'),
    pressure: z.number().optional().describe('Atmospheric pressure'),
    windSpeed: z.number().optional().describe('Wind speed'),
    windGust: z.number().optional().describe('Wind gust speed'),
    windBearing: z.number().optional().describe('Wind direction in degrees'),
    cloudCover: z.number().optional().describe('Cloud cover (0-1)'),
    visibility: z.number().optional().describe('Visibility distance'),
    uvIndex: z.number().optional().describe('UV index'),
    ozone: z.number().optional().describe('Ozone level'),
    precipIntensity: z.number().optional().describe('Precipitation intensity'),
    precipProbability: z.number().optional().describe('Precipitation probability'),
    precipType: z.string().optional().describe('Precipitation type')
  })
  .passthrough();

export let getWeatherForecast = SlateTool.create(spec, {
  name: 'Get Weather Forecast',
  key: 'get_weather_forecast',
  description: `Retrieve weather forecast data including temperature, precipitation, humidity, wind, and more. Supports minutely, hourly, and daily granularity.`,
  constraints: ['Forecast covers up to 72 hours ahead.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).describe('Longitude (-180 to 180)'),
      filter: z
        .enum(['minutely', 'hourly', 'daily'])
        .optional()
        .describe('Forecast granularity (minutely, hourly, or daily)')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        lat: z.any().optional(),
        lng: z.any().optional(),
        forecasts: z.array(forecastEntrySchema).describe('Weather forecast entries')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language,
      units: ctx.config.units
    });

    let units = ctx.config.units === 'si' ? 'si' : undefined;
    let result = await client.getWeatherForecast(
      ctx.input.lat,
      ctx.input.lng,
      units,
      ctx.input.filter
    );
    let forecasts = result.data?.forecast || [];

    return {
      output: {
        message: result.message,
        lat: result.data?.lat,
        lng: result.data?.lng,
        forecasts
      },
      message: `Retrieved **${forecasts.length}** weather forecast entries for (${ctx.input.lat}, ${ctx.input.lng})${ctx.input.filter ? ` with ${ctx.input.filter} granularity` : ''}.`
    };
  })
  .build();
