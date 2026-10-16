import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { weatherArray, weatherString, weatherTimestamp } from '../lib/validation';
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
    rainLastHour: z.number().optional().describe('Rain precipitation in mm/h'),
    snowLastHour: z.number().optional().describe('Snow precipitation in mm/h'),
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
  rainVolume: z.number().optional().describe('Rain forecast intensity in mm/h'),
  snowVolume: z.number().optional().describe('Snow forecast intensity in mm/h'),
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
      minutelyForecasts: z
        .array(
          z.object({
            timestamp: z.string().describe('Forecast time (ISO 8601)'),
            precipitation: z.number().describe('Precipitation in mm/h')
          })
        )
        .optional()
        .describe('Minute precipitation forecast for 1 hour, when provided'),
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
      weatherArray(weather).map((w: any) => ({
        conditionId: w.id,
        group: w.main,
        description: w.description,
        icon: w.icon
      }));

    let current = data.current
      ? {
          timestamp: weatherTimestamp(data.current.dt),
          sunrise: data.current.sunrise ? weatherTimestamp(data.current.sunrise) : undefined,
          sunset: data.current.sunset ? weatherTimestamp(data.current.sunset) : undefined,
          temperature: data.current.temp,
          feelsLike: data.current.feels_like,
          pressure: data.current.pressure,
          humidity: data.current.humidity,
          dewPoint: data.current.dew_point ?? undefined,
          uvIndex: data.current.uvi ?? undefined,
          cloudiness: data.current.clouds ?? undefined,
          visibility: data.current.visibility ?? undefined,
          windSpeed: data.current.wind_speed ?? undefined,
          windDirection: data.current.wind_deg ?? undefined,
          windGust: data.current.wind_gust ?? undefined,
          rainLastHour: data.current.rain?.['1h'] ?? undefined,
          snowLastHour: data.current.snow?.['1h'] ?? undefined,
          conditions: mapConditions(data.current.weather)
        }
      : undefined;

    let minutelyForecasts = data.minutely
      ? data.minutely.map((entry: any) => ({
          timestamp: weatherTimestamp(entry.dt),
          precipitation: entry.precipitation
        }))
      : undefined;

    let hourlyForecasts = data.hourly
      ? data.hourly.map((h: any) => ({
          timestamp: weatherTimestamp(h.dt),
          temperature: h.temp,
          feelsLike: h.feels_like,
          pressure: h.pressure,
          humidity: h.humidity,
          dewPoint: h.dew_point ?? undefined,
          uvIndex: h.uvi ?? undefined,
          cloudiness: h.clouds ?? undefined,
          visibility: h.visibility ?? undefined,
          windSpeed: h.wind_speed ?? undefined,
          windDirection: h.wind_deg ?? undefined,
          windGust: h.wind_gust ?? undefined,
          precipitationProbability: h.pop ?? undefined,
          rainVolume: h.rain?.['1h'] ?? undefined,
          snowVolume: h.snow?.['1h'] ?? undefined,
          conditionGroup: weatherString(h.weather?.[0]?.main),
          conditionDescription: weatherString(h.weather?.[0]?.description)
        }))
      : undefined;

    let dailyForecasts = data.daily
      ? data.daily.map((d: any) => ({
          timestamp: weatherTimestamp(d.dt),
          sunrise: d.sunrise ? weatherTimestamp(d.sunrise) : undefined,
          sunset: d.sunset ? weatherTimestamp(d.sunset) : undefined,
          temperatureDay: d.temp.day,
          temperatureNight: d.temp.night,
          temperatureMin: d.temp.min,
          temperatureMax: d.temp.max,
          temperatureMorning: d.temp.morn ?? undefined,
          temperatureEvening: d.temp.eve ?? undefined,
          pressure: d.pressure ?? undefined,
          humidity: d.humidity ?? undefined,
          dewPoint: d.dew_point ?? undefined,
          windSpeed: d.wind_speed ?? undefined,
          windDirection: d.wind_deg ?? undefined,
          cloudiness: d.clouds ?? undefined,
          uvIndex: d.uvi ?? undefined,
          precipitationProbability: d.pop ?? undefined,
          rainVolume: d.rain ?? undefined,
          snowVolume: d.snow ?? undefined,
          summary: d.summary ?? undefined,
          conditionGroup: weatherString(d.weather?.[0]?.main),
          conditionDescription: weatherString(d.weather?.[0]?.description)
        }))
      : undefined;

    let alerts = data.alerts
      ? data.alerts.map((a: any) => ({
          senderName: a.sender_name,
          eventName: a.event,
          start: weatherTimestamp(a.start),
          end: weatherTimestamp(a.end),
          description: a.description,
          tags: a.tags ?? undefined
        }))
      : undefined;

    let output = {
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      timezoneOffset: data.timezone_offset,
      current,
      minutelyForecasts,
      hourlyForecasts,
      dailyForecasts,
      alerts
    };

    let parts: string[] = [];
    if (current)
      parts.push(
        `Current: ${current.temperature}°, ${current.conditions.map((c: any) => c.description).join(', ')}`
      );
    if (minutelyForecasts)
      parts.push(`${minutelyForecasts.length} minute precipitation forecasts`);
    if (hourlyForecasts) parts.push(`${hourlyForecasts.length} hourly forecasts`);
    if (dailyForecasts) parts.push(`${dailyForecasts.length} daily forecasts`);
    if (alerts && alerts.length > 0) parts.push(`**${alerts.length} active alert(s)**`);

    return {
      output,
      message: `Weather for (${output.latitude}, ${output.longitude}) — ${output.timezone}. ${parts.join('. ')}.`
    };
  })
  .build();
