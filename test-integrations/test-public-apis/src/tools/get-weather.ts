import { SlateTool } from 'slates';
import { z } from 'zod';
import { openMeteoAxios } from '../clients';
import { spec } from '../spec';

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Get current weather for a given latitude/longitude from the free Open-Meteo API (https://open-meteo.com). No API key required.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude in decimal degrees.'),
      longitude: z.number().min(-180).max(180).describe('Longitude in decimal degrees.'),
      temperatureUnit: z
        .enum(['celsius', 'fahrenheit'])
        .default('celsius')
        .describe('Temperature unit.'),
      windSpeedUnit: z
        .enum(['kmh', 'ms', 'mph', 'kn'])
        .default('kmh')
        .describe('Wind speed unit.')
    })
  )
  .output(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      timezone: z.string().nullable(),
      current: z.object({
        time: z.string().nullable(),
        temperature: z.number().nullable(),
        apparentTemperature: z.number().nullable(),
        humidity: z.number().nullable(),
        windSpeed: z.number().nullable(),
        windDirection: z.number().nullable(),
        weatherCode: z.number().nullable(),
        isDay: z.boolean().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    let response = await openMeteoAxios.get('/forecast', {
      params: {
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude,
        temperature_unit: ctx.input.temperatureUnit,
        wind_speed_unit: ctx.input.windSpeedUnit,
        current: [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'wind_speed_10m',
          'wind_direction_10m',
          'weather_code',
          'is_day'
        ].join(',')
      }
    });
    let data = response.data;
    let current = data?.current ?? {};

    let isDayRaw = current.is_day;
    let isDay =
      typeof isDayRaw === 'number'
        ? isDayRaw === 1
        : typeof isDayRaw === 'boolean'
          ? isDayRaw
          : null;

    return {
      output: {
        latitude: Number(data?.latitude ?? ctx.input.latitude),
        longitude: Number(data?.longitude ?? ctx.input.longitude),
        timezone: data?.timezone ?? null,
        current: {
          time: current.time ?? null,
          temperature:
            typeof current.temperature_2m === 'number' ? current.temperature_2m : null,
          apparentTemperature:
            typeof current.apparent_temperature === 'number'
              ? current.apparent_temperature
              : null,
          humidity:
            typeof current.relative_humidity_2m === 'number'
              ? current.relative_humidity_2m
              : null,
          windSpeed:
            typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : null,
          windDirection:
            typeof current.wind_direction_10m === 'number' ? current.wind_direction_10m : null,
          weatherCode: typeof current.weather_code === 'number' ? current.weather_code : null,
          isDay
        }
      },
      message: `Current weather at (**${ctx.input.latitude}**, **${ctx.input.longitude}**): **${current.temperature_2m ?? '?'}°** (${ctx.input.temperatureUnit}), wind **${current.wind_speed_10m ?? '?'}** ${ctx.input.windSpeedUnit}.`
    };
  })
  .build();
