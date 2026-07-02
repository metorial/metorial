import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let weatherRecordSchema = z
  .object({
    time: z.number().optional().describe('Timestamp'),
    temperature: z.number().optional().describe('Temperature'),
    apparentTemperature: z.number().optional().describe('Feels-like temperature'),
    summary: z.string().optional().describe('Weather summary'),
    icon: z
      .string()
      .optional()
      .describe('Weather icon (clear, cloudy, rain, snow, fog, etc.)'),
    dewPoint: z.number().optional().describe('Dew point'),
    humidity: z.number().optional().describe('Humidity (0-1)'),
    pressure: z.number().optional().describe('Atmospheric pressure'),
    windSpeed: z.number().optional().describe('Wind speed'),
    windGust: z.number().optional().describe('Wind gust speed'),
    windBearing: z.number().optional().describe('Wind direction in degrees'),
    cloudCover: z.number().optional().describe('Cloud cover (0-1)'),
    visibility: z.number().optional().describe('Visibility distance'),
    ozone: z.number().optional().describe('Ozone level'),
    lat: z.any().optional(),
    lng: z.any().optional()
  })
  .passthrough();

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Retrieve current weather conditions for a location including temperature, humidity, pressure, wind, cloud cover, visibility, and dew point. Supports imperial (default) and SI units via configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).describe('Longitude (-180 to 180)')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        weather: weatherRecordSchema.describe('Current weather conditions')
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
    let result = await client.getWeatherLatest(ctx.input.lat, ctx.input.lng, units);
    let weather = result.data || {};

    let summary = weather.summary
      ? `Current weather at (${ctx.input.lat}, ${ctx.input.lng}): **${weather.summary}**, ${weather.temperature}°, humidity ${Math.round((weather.humidity || 0) * 100)}%.`
      : `Retrieved weather data for (${ctx.input.lat}, ${ctx.input.lng}).`;

    return {
      output: {
        message: result.message,
        weather
      },
      message: summary
    };
  })
  .build();
