import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWeather = SlateTool.create(spec, {
  name: 'Get Weather',
  key: 'get_weather',
  description: `Retrieve current weather conditions for a location by city name or ZIP code. Returns temperature, wind, humidity, and other atmospheric data.`,
  instructions: ['Provide either a city name or a ZIP code, not both.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      city: z.string().optional().describe('City name (e.g. "San Francisco", "London")'),
      zip: z.string().optional().describe('ZIP/postal code (e.g. "64082")')
    })
  )
  .output(
    z.object({
      tempC: z.number().optional().describe('Temperature in Celsius'),
      tempF: z.number().optional().describe('Temperature in Fahrenheit'),
      windMph: z.number().optional().describe('Wind speed in miles per hour'),
      windKph: z.number().optional().describe('Wind speed in kilometers per hour'),
      windDegree: z.number().optional().describe('Wind direction in degrees'),
      windDir: z.string().optional().describe('Wind compass direction'),
      pressureMb: z.number().optional().describe('Atmospheric pressure in millibars'),
      precipMm: z.number().optional().describe('Precipitation in millimeters'),
      feelslikeC: z.number().optional().describe('Feels-like temperature in Celsius'),
      feelslikeF: z.number().optional().describe('Feels-like temperature in Fahrenheit'),
      humidity: z.number().optional().describe('Humidity percentage'),
      condition: z.string().optional().describe('Weather condition text'),
      location: z.string().optional().describe('Resolved location name'),
      rawData: z.any().optional().describe('Full weather data from the API')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.city && !ctx.input.zip) {
      throw new Error('Either city or zip must be provided');
    }

    let client = new Client({ token: ctx.auth.token });
    let params: { city?: string; zip?: string } = {};
    if (ctx.input.city) params.city = ctx.input.city;
    if (ctx.input.zip) params.zip = ctx.input.zip;

    let result = await client.getWeather(params);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Weather lookup failed');
    }

    let data = result.data as any;

    let output = {
      tempC: data.tempC ?? data.temp_c,
      tempF: data.tempF ?? data.temp_f,
      windMph: data.windMph ?? data.wind_mph,
      windKph: data.windKph ?? data.wind_kph,
      windDegree: data.windDegree ?? data.wind_degree,
      windDir: data.windDir ?? data.wind_dir,
      pressureMb: data.pressureMb ?? data.pressure_mb,
      precipMm: data.precipMm ?? data.precip_mm,
      feelslikeC: data.feelslikeC ?? data.feelslike_c,
      feelslikeF: data.feelslikeF ?? data.feelslike_f,
      humidity: data.humidity,
      condition: data.condition?.text ?? data.conditionText ?? data.condition,
      location: data.location?.name ?? data.locationName ?? (ctx.input.city || ctx.input.zip),
      rawData: data
    };

    let locationLabel = ctx.input.city || ctx.input.zip || 'the specified location';
    let tempInfo = output.tempC != null ? ` ${output.tempC}°C / ${output.tempF}°F` : '';

    return {
      output,
      message: `Weather for **${locationLabel}**:${tempInfo}${output.condition ? `, ${output.condition}` : ''}.`
    };
  })
  .build();
