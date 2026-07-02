import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

let forecastEntrySchema = z.object({
  timestamp: z.string().describe('Forecast time (ISO 8601)'),
  temperature: z.number().describe('Temperature'),
  feelsLike: z.number().describe('Perceived temperature'),
  temperatureMin: z.number().describe('Minimum temperature'),
  temperatureMax: z.number().describe('Maximum temperature'),
  pressure: z.number().describe('Atmospheric pressure in hPa'),
  humidity: z.number().describe('Humidity percentage'),
  seaLevelPressure: z.number().optional().describe('Sea level pressure in hPa'),
  groundLevelPressure: z.number().optional().describe('Ground level pressure in hPa'),
  windSpeed: z.number().optional().describe('Wind speed'),
  windDirection: z.number().optional().describe('Wind direction in degrees'),
  windGust: z.number().optional().describe('Wind gust speed'),
  cloudiness: z.number().optional().describe('Cloudiness percentage'),
  visibility: z.number().optional().describe('Visibility in meters'),
  precipitationProbability: z
    .number()
    .optional()
    .describe('Probability of precipitation (0-1)'),
  rainVolume: z.number().optional().describe('Rain volume for 3 hours in mm'),
  snowVolume: z.number().optional().describe('Snow volume for 3 hours in mm'),
  conditionGroup: z.string().describe('Weather condition group'),
  conditionDescription: z.string().describe('Weather condition description'),
  conditionIcon: z.string().describe('Weather icon ID')
});

export let getForecast = SlateTool.create(spec, {
  name: 'Get Weather Forecast',
  key: 'get_forecast',
  description: `Retrieve a 5-day weather forecast with 3-hour intervals for a location. Returns up to 40 forecast data points with temperature, humidity, wind, precipitation probability, and weather conditions. Available on free plans.`,
  constraints: [
    'Returns up to 40 forecast timestamps (5 days, 3-hour intervals)',
    'Available on free API plans'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location'),
      count: z
        .number()
        .min(1)
        .max(40)
        .optional()
        .describe('Number of forecast timestamps to return (max 40)')
    })
  )
  .output(
    z.object({
      cityName: z.string().describe('City name'),
      country: z.string().describe('Country code'),
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      timezone: z.number().describe('Shift in seconds from UTC'),
      sunrise: z.string().optional().describe('Sunrise time (ISO 8601)'),
      sunset: z.string().optional().describe('Sunset time (ISO 8601)'),
      totalEntries: z.number().describe('Number of forecast entries returned'),
      forecasts: z.array(forecastEntrySchema).describe('Forecast entries at 3-hour intervals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token,
      units: ctx.config.units,
      lang: ctx.config.language
    });

    let data = await client.getForecast(
      ctx.input.latitude,
      ctx.input.longitude,
      ctx.input.count
    );

    let forecasts = (data.list || []).map((entry: any) => ({
      timestamp: new Date(entry.dt * 1000).toISOString(),
      temperature: entry.main.temp,
      feelsLike: entry.main.feels_like,
      temperatureMin: entry.main.temp_min,
      temperatureMax: entry.main.temp_max,
      pressure: entry.main.pressure,
      humidity: entry.main.humidity,
      seaLevelPressure: entry.main.sea_level,
      groundLevelPressure: entry.main.grnd_level,
      windSpeed: entry.wind?.speed,
      windDirection: entry.wind?.deg,
      windGust: entry.wind?.gust,
      cloudiness: entry.clouds?.all,
      visibility: entry.visibility,
      precipitationProbability: entry.pop,
      rainVolume: entry.rain?.['3h'],
      snowVolume: entry.snow?.['3h'],
      conditionGroup: entry.weather?.[0]?.main || '',
      conditionDescription: entry.weather?.[0]?.description || '',
      conditionIcon: entry.weather?.[0]?.icon || ''
    }));

    let output = {
      cityName: data.city?.name || '',
      country: data.city?.country || '',
      latitude: data.city?.coord?.lat,
      longitude: data.city?.coord?.lon,
      timezone: data.city?.timezone,
      sunrise: data.city?.sunrise
        ? new Date(data.city.sunrise * 1000).toISOString()
        : undefined,
      sunset: data.city?.sunset ? new Date(data.city.sunset * 1000).toISOString() : undefined,
      totalEntries: forecasts.length,
      forecasts
    };

    return {
      output,
      message: `Retrieved **${output.totalEntries}** forecast entries for **${output.cityName}, ${output.country}**.`
    };
  })
  .build();
