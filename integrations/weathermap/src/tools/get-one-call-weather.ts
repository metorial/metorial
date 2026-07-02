import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

let weatherConditionSchema = z.object({
  conditionId: z.number().describe('Weather condition ID'),
  group: z.string().describe('Group of weather parameters'),
  description: z.string().describe('Weather condition description'),
  icon: z.string().describe('Weather icon ID')
});

let currentWeatherSchema = z
  .object({
    timestamp: z.string().describe('Current time (ISO 8601)'),
    sunrise: z.string().optional().describe('Sunrise time (ISO 8601)'),
    sunset: z.string().optional().describe('Sunset time (ISO 8601)'),
    temperature: z.number().describe('Current temperature'),
    feelsLike: z.number().describe('Perceived temperature'),
    pressure: z.number().describe('Atmospheric pressure in hPa'),
    humidity: z.number().describe('Humidity percentage'),
    dewPoint: z.number().optional().describe('Dew point temperature'),
    uvIndex: z.number().optional().describe('UV index'),
    cloudiness: z.number().optional().describe('Cloudiness percentage'),
    visibility: z.number().optional().describe('Visibility in meters'),
    windSpeed: z.number().optional().describe('Wind speed'),
    windDirection: z.number().optional().describe('Wind direction in degrees'),
    windGust: z.number().optional().describe('Wind gust speed'),
    conditions: z.array(weatherConditionSchema).describe('Weather conditions')
  })
  .optional();

let hourlyForecastSchema = z.object({
  timestamp: z.string().describe('Forecast time (ISO 8601)'),
  temperature: z.number().describe('Temperature'),
  feelsLike: z.number().describe('Perceived temperature'),
  pressure: z.number().describe('Atmospheric pressure in hPa'),
  humidity: z.number().describe('Humidity percentage'),
  dewPoint: z.number().optional().describe('Dew point'),
  uvIndex: z.number().optional().describe('UV index'),
  cloudiness: z.number().optional().describe('Cloudiness percentage'),
  visibility: z.number().optional().describe('Visibility in meters'),
  windSpeed: z.number().optional().describe('Wind speed'),
  windDirection: z.number().optional().describe('Wind direction in degrees'),
  windGust: z.number().optional().describe('Wind gust speed'),
  precipitationProbability: z.number().optional().describe('Probability of precipitation'),
  conditionGroup: z.string().describe('Weather condition group'),
  conditionDescription: z.string().describe('Weather condition description')
});

let dailyForecastSchema = z.object({
  timestamp: z.string().describe('Day date (ISO 8601)'),
  sunrise: z.string().optional().describe('Sunrise (ISO 8601)'),
  sunset: z.string().optional().describe('Sunset (ISO 8601)'),
  temperatureDay: z.number().describe('Day temperature'),
  temperatureNight: z.number().describe('Night temperature'),
  temperatureMin: z.number().describe('Min temperature'),
  temperatureMax: z.number().describe('Max temperature'),
  temperatureMorning: z.number().optional().describe('Morning temperature'),
  temperatureEvening: z.number().optional().describe('Evening temperature'),
  pressure: z.number().optional().describe('Atmospheric pressure in hPa'),
  humidity: z.number().optional().describe('Humidity percentage'),
  dewPoint: z.number().optional().describe('Dew point'),
  windSpeed: z.number().optional().describe('Wind speed'),
  windDirection: z.number().optional().describe('Wind direction in degrees'),
  cloudiness: z.number().optional().describe('Cloudiness percentage'),
  uvIndex: z.number().optional().describe('UV index'),
  precipitationProbability: z.number().optional().describe('Probability of precipitation'),
  rainVolume: z.number().optional().describe('Rain volume in mm'),
  snowVolume: z.number().optional().describe('Snow volume in mm'),
  summary: z.string().optional().describe('Human-readable summary'),
  conditionGroup: z.string().describe('Weather condition group'),
  conditionDescription: z.string().describe('Weather condition description')
});

let alertSchema = z.object({
  senderName: z.string().describe('Alert source'),
  eventName: z.string().describe('Alert event type'),
  start: z.string().describe('Alert start time (ISO 8601)'),
  end: z.string().describe('Alert end time (ISO 8601)'),
  description: z.string().describe('Alert description'),
  tags: z.array(z.string()).optional().describe('Alert tags')
});

export let getOneCallWeather = SlateTool.create(spec, {
  name: 'Get Comprehensive Weather',
  key: 'get_one_call_weather',
  description: `Retrieve comprehensive weather data for a location using the One Call API 3.0: current conditions, minute-by-minute precipitation for 1 hour, hourly forecast for 48 hours, daily forecast for 8 days, and government weather alerts — all in one call. Requires a One Call API 3.0 subscription (includes 1,000 free calls/day).`,
  instructions: [
    'Use the exclude parameter to omit data sections you do not need, reducing response size',
    'This endpoint requires a separate "One Call by Call" subscription'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location'),
      exclude: z
        .array(z.enum(['current', 'minutely', 'hourly', 'daily', 'alerts']))
        .optional()
        .describe('Data sections to exclude from the response')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      timezone: z.string().describe('Timezone name (e.g. "America/New_York")'),
      timezoneOffset: z.number().describe('Shift in seconds from UTC'),
      current: currentWeatherSchema.describe('Current weather conditions'),
      hourlyForecasts: z
        .array(hourlyForecastSchema)
        .optional()
        .describe('Hourly forecast for 48 hours'),
      dailyForecasts: z
        .array(dailyForecastSchema)
        .optional()
        .describe('Daily forecast for 8 days'),
      alerts: z.array(alertSchema).optional().describe('Government weather alerts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token,
      units: ctx.config.units,
      lang: ctx.config.language
    });

    let data = await client.getOneCall(
      ctx.input.latitude,
      ctx.input.longitude,
      ctx.input.exclude
    );

    let mapConditions = (weather: any[]) =>
      (weather || []).map((w: any) => ({
        conditionId: w.id,
        group: w.main,
        description: w.description,
        icon: w.icon
      }));

    let current = data.current
      ? {
          timestamp: new Date(data.current.dt * 1000).toISOString(),
          sunrise: data.current.sunrise
            ? new Date(data.current.sunrise * 1000).toISOString()
            : undefined,
          sunset: data.current.sunset
            ? new Date(data.current.sunset * 1000).toISOString()
            : undefined,
          temperature: data.current.temp,
          feelsLike: data.current.feels_like,
          pressure: data.current.pressure,
          humidity: data.current.humidity,
          dewPoint: data.current.dew_point,
          uvIndex: data.current.uvi,
          cloudiness: data.current.clouds,
          visibility: data.current.visibility,
          windSpeed: data.current.wind_speed,
          windDirection: data.current.wind_deg,
          windGust: data.current.wind_gust,
          conditions: mapConditions(data.current.weather)
        }
      : undefined;

    let hourlyForecasts = data.hourly
      ? data.hourly.map((h: any) => ({
          timestamp: new Date(h.dt * 1000).toISOString(),
          temperature: h.temp,
          feelsLike: h.feels_like,
          pressure: h.pressure,
          humidity: h.humidity,
          dewPoint: h.dew_point,
          uvIndex: h.uvi,
          cloudiness: h.clouds,
          visibility: h.visibility,
          windSpeed: h.wind_speed,
          windDirection: h.wind_deg,
          windGust: h.wind_gust,
          precipitationProbability: h.pop,
          conditionGroup: h.weather?.[0]?.main || '',
          conditionDescription: h.weather?.[0]?.description || ''
        }))
      : undefined;

    let dailyForecasts = data.daily
      ? data.daily.map((d: any) => ({
          timestamp: new Date(d.dt * 1000).toISOString(),
          sunrise: d.sunrise ? new Date(d.sunrise * 1000).toISOString() : undefined,
          sunset: d.sunset ? new Date(d.sunset * 1000).toISOString() : undefined,
          temperatureDay: d.temp.day,
          temperatureNight: d.temp.night,
          temperatureMin: d.temp.min,
          temperatureMax: d.temp.max,
          temperatureMorning: d.temp.morn,
          temperatureEvening: d.temp.eve,
          pressure: d.pressure,
          humidity: d.humidity,
          dewPoint: d.dew_point,
          windSpeed: d.wind_speed,
          windDirection: d.wind_deg,
          cloudiness: d.clouds,
          uvIndex: d.uvi,
          precipitationProbability: d.pop,
          rainVolume: d.rain,
          snowVolume: d.snow,
          summary: d.summary,
          conditionGroup: d.weather?.[0]?.main || '',
          conditionDescription: d.weather?.[0]?.description || ''
        }))
      : undefined;

    let alerts = data.alerts
      ? data.alerts.map((a: any) => ({
          senderName: a.sender_name,
          eventName: a.event,
          start: new Date(a.start * 1000).toISOString(),
          end: new Date(a.end * 1000).toISOString(),
          description: a.description,
          tags: a.tags
        }))
      : undefined;

    let output = {
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      timezoneOffset: data.timezone_offset,
      current,
      hourlyForecasts,
      dailyForecasts,
      alerts
    };

    let parts: string[] = [];
    if (current)
      parts.push(
        `Current: ${current.temperature}°, ${current.conditions.map((c: any) => c.description).join(', ')}`
      );
    if (hourlyForecasts) parts.push(`${hourlyForecasts.length} hourly forecasts`);
    if (dailyForecasts) parts.push(`${dailyForecasts.length} daily forecasts`);
    if (alerts && alerts.length > 0) parts.push(`**${alerts.length} active alert(s)**`);

    return {
      output,
      message: `Weather for (${output.latitude}, ${output.longitude}) — ${output.timezone}. ${parts.join('. ')}.`
    };
  })
  .build();
