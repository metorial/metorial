import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Retrieve current weather conditions for a location. You can specify the location by latitude/longitude coordinates, city name, or US zip code. Returns temperature, humidity, wind, and sunrise/sunset times.`,
  instructions: ['Provide either lat/lon, city, or zip — only one location method is needed.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().optional().describe('Latitude of the location'),
      lon: z.number().optional().describe('Longitude of the location'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('US state (for US cities only)'),
      country: z.string().optional().describe('Country name'),
      zip: z.string().optional().describe('5-digit US ZIP code')
    })
  )
  .output(
    z.object({
      tempCelsius: z.number().describe('Current temperature in Celsius'),
      feelsLikeCelsius: z.number().describe('Perceived temperature in Celsius'),
      humidity: z.number().describe('Humidity percentage'),
      minTempCelsius: z.number().describe('Minimum temperature in Celsius'),
      maxTempCelsius: z.number().describe('Maximum temperature in Celsius'),
      windSpeedMs: z.number().describe('Wind speed in meters per second'),
      windDegrees: z.number().describe('Wind direction in degrees'),
      sunrise: z.number().describe('Sunrise time as Unix timestamp'),
      sunset: z.number().describe('Sunset time as Unix timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};

    if (ctx.input.lat !== undefined && ctx.input.lon !== undefined) {
      params.lat = ctx.input.lat;
      params.lon = ctx.input.lon;
    }
    if (ctx.input.city) params.city = ctx.input.city;
    if (ctx.input.state) params.state = ctx.input.state;
    if (ctx.input.country) params.country = ctx.input.country;
    if (ctx.input.zip) params.zip = ctx.input.zip;

    let result = await client.getWeather(params);

    let locationLabel =
      ctx.input.city ?? ctx.input.zip ?? `${ctx.input.lat}, ${ctx.input.lon}`;

    return {
      output: {
        tempCelsius: result.temp,
        feelsLikeCelsius: result.feels_like,
        humidity: result.humidity,
        minTempCelsius: result.min_temp,
        maxTempCelsius: result.max_temp,
        windSpeedMs: result.wind_speed,
        windDegrees: result.wind_degrees,
        sunrise: result.sunrise,
        sunset: result.sunset
      },
      message: `Weather in **${locationLabel}**: **${result.temp}°C** (feels like ${result.feels_like}°C), humidity ${result.humidity}%, wind ${result.wind_speed} m/s.`
    };
  })
  .build();
