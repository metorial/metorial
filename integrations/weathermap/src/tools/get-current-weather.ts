import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

let weatherConditionSchema = z.object({
  conditionId: z.number().describe('Weather condition ID'),
  group: z.string().describe('Group of weather parameters (Rain, Snow, Clouds, etc.)'),
  description: z.string().describe('Weather condition description'),
  icon: z.string().describe('Weather icon ID')
});

export let getCurrentWeather = SlateTool.create(spec, {
  name: 'Get Current Weather',
  key: 'get_current_weather',
  description: `Retrieve real-time weather conditions for a specific location. Returns temperature, humidity, pressure, wind, visibility, cloud coverage, and weather descriptions. Useful for checking live weather at any coordinates on Earth.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location')
    })
  )
  .output(
    z.object({
      locationName: z.string().describe('Name of the location'),
      country: z.string().describe('Country code'),
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      temperature: z.number().describe('Current temperature'),
      feelsLike: z.number().describe('Perceived temperature'),
      temperatureMin: z.number().describe('Minimum temperature at the moment'),
      temperatureMax: z.number().describe('Maximum temperature at the moment'),
      pressure: z.number().describe('Atmospheric pressure in hPa'),
      humidity: z.number().describe('Humidity percentage'),
      seaLevelPressure: z.number().optional().describe('Sea level pressure in hPa'),
      groundLevelPressure: z.number().optional().describe('Ground level pressure in hPa'),
      visibility: z.number().optional().describe('Visibility in meters (max 10km)'),
      windSpeed: z.number().optional().describe('Wind speed'),
      windDirection: z.number().optional().describe('Wind direction in degrees'),
      windGust: z.number().optional().describe('Wind gust speed'),
      cloudiness: z.number().optional().describe('Cloudiness percentage'),
      rainLastHour: z.number().optional().describe('Rain volume for the last 1 hour in mm'),
      rainLastThreeHours: z
        .number()
        .optional()
        .describe('Rain volume for the last 3 hours in mm'),
      snowLastHour: z.number().optional().describe('Snow volume for the last 1 hour in mm'),
      snowLastThreeHours: z
        .number()
        .optional()
        .describe('Snow volume for the last 3 hours in mm'),
      conditions: z.array(weatherConditionSchema).describe('Weather conditions'),
      sunrise: z.string().optional().describe('Sunrise time (ISO 8601)'),
      sunset: z.string().optional().describe('Sunset time (ISO 8601)'),
      observedAt: z.string().describe('Data observation time (ISO 8601)'),
      timezone: z.number().describe('Shift in seconds from UTC')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token,
      units: ctx.config.units,
      lang: ctx.config.language
    });

    let data = await client.getCurrentWeather(ctx.input.latitude, ctx.input.longitude);

    let output = {
      locationName: data.name || '',
      country: data.sys?.country || '',
      latitude: data.coord?.lat,
      longitude: data.coord?.lon,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      temperatureMin: data.main.temp_min,
      temperatureMax: data.main.temp_max,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      seaLevelPressure: data.main.sea_level,
      groundLevelPressure: data.main.grnd_level,
      visibility: data.visibility,
      windSpeed: data.wind?.speed,
      windDirection: data.wind?.deg,
      windGust: data.wind?.gust,
      cloudiness: data.clouds?.all,
      rainLastHour: data.rain?.['1h'],
      rainLastThreeHours: data.rain?.['3h'],
      snowLastHour: data.snow?.['1h'],
      snowLastThreeHours: data.snow?.['3h'],
      conditions: (data.weather || []).map((w: any) => ({
        conditionId: w.id,
        group: w.main,
        description: w.description,
        icon: w.icon
      })),
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : undefined,
      sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : undefined,
      observedAt: new Date(data.dt * 1000).toISOString(),
      timezone: data.timezone
    };

    let conditionText = output.conditions.map((c: any) => c.description).join(', ');

    return {
      output,
      message: `**${output.locationName}, ${output.country}**: ${output.temperature}° — ${conditionText}. Humidity: ${output.humidity}%, Wind: ${output.windSpeed ?? 'N/A'} m/s.`
    };
  })
  .build();
