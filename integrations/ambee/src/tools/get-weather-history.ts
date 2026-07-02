import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let weatherHistoryRecordSchema = z
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
    cloudCover: z.number().optional().describe('Cloud cover'),
    visibility: z.number().optional().describe('Visibility distance'),
    ozone: z.number().optional().describe('Ozone level')
  })
  .passthrough();

export let getWeatherHistory = SlateTool.create(spec, {
  name: 'Get Weather History',
  key: 'get_weather_history',
  description: `Retrieve historical weather data for a location within a specified time window. Returns hourly records with temperature, humidity, wind, pressure, and more.`,
  constraints: [
    'Maximum query window is 48 hours.',
    'Timestamps must be in format "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).describe('Longitude (-180 to 180)'),
      from: z.string().describe('Start timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      to: z.string().describe('End timestamp in "YYYY-MM-DD HH:mm:ss" format')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        records: z.array(weatherHistoryRecordSchema).describe('Historical weather records')
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
    let result = await client.getWeatherHistory(
      ctx.input.lat,
      ctx.input.lng,
      ctx.input.from,
      ctx.input.to,
      units
    );
    let records = result.data?.history || [];

    return {
      output: {
        message: result.message || result.status,
        records
      },
      message: `Retrieved **${records.length}** historical weather records from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
