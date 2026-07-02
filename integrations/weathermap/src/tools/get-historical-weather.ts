import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenWeatherClient } from '../lib/client';
import { spec } from '../spec';

export let getHistoricalWeather = SlateTool.create(spec, {
  name: 'Get Historical Weather',
  key: 'get_historical_weather',
  description: `Retrieve historical weather data for a specific location and date. Supports two modes: **timemachine** returns hourly data for a specific Unix timestamp, and **day summary** returns aggregated data for a specific calendar date. Covers 47+ years of data starting from January 1, 1979. Requires One Call API 3.0 subscription.`,
  instructions: [
    'Use mode "timemachine" with a Unix timestamp to get hourly data for that moment',
    'Use mode "day_summary" with a date in YYYY-MM-DD format to get daily aggregated data'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the location'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the location'),
      mode: z.enum(['timemachine', 'day_summary']).describe('Type of historical query'),
      unixTimestamp: z
        .number()
        .optional()
        .describe('Unix timestamp (UTC) for timemachine mode'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format for day_summary mode')
    })
  )
  .output(
    z.object({
      latitude: z.number().describe('Latitude'),
      longitude: z.number().describe('Longitude'),
      timezone: z.string().optional().describe('Timezone name'),
      timezoneOffset: z.number().optional().describe('Shift in seconds from UTC'),
      hourlyData: z
        .array(
          z.object({
            timestamp: z.string().describe('Time (ISO 8601)'),
            temperature: z.number().describe('Temperature'),
            feelsLike: z.number().describe('Perceived temperature'),
            pressure: z.number().describe('Atmospheric pressure in hPa'),
            humidity: z.number().describe('Humidity percentage'),
            dewPoint: z.number().optional().describe('Dew point'),
            cloudiness: z.number().optional().describe('Cloudiness percentage'),
            windSpeed: z.number().optional().describe('Wind speed'),
            windDirection: z.number().optional().describe('Wind direction in degrees'),
            visibility: z.number().optional().describe('Visibility in meters'),
            conditionGroup: z.string().optional().describe('Weather condition group'),
            conditionDescription: z
              .string()
              .optional()
              .describe('Weather condition description')
          })
        )
        .optional()
        .describe('Hourly data (timemachine mode)'),
      daySummary: z
        .object({
          date: z.string().describe('Date (YYYY-MM-DD)'),
          temperatureMin: z.number().optional().describe('Minimum temperature'),
          temperatureMax: z.number().optional().describe('Maximum temperature'),
          temperatureMorning: z.number().optional().describe('Morning temperature'),
          temperatureAfternoon: z.number().optional().describe('Afternoon temperature'),
          temperatureEvening: z.number().optional().describe('Evening temperature'),
          temperatureNight: z.number().optional().describe('Night temperature'),
          pressure: z.number().optional().describe('Atmospheric pressure in hPa'),
          humidity: z.number().optional().describe('Humidity percentage'),
          windSpeed: z.number().optional().describe('Max wind speed'),
          precipitationTotal: z.number().optional().describe('Total precipitation in mm'),
          cloudCoverageAfternoon: z
            .number()
            .optional()
            .describe('Afternoon cloud coverage percentage')
        })
        .optional()
        .describe('Daily aggregated data (day_summary mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpenWeatherClient({
      apiKey: ctx.auth.token,
      units: ctx.config.units,
      lang: ctx.config.language
    });

    if (ctx.input.mode === 'timemachine') {
      if (!ctx.input.unixTimestamp) {
        throw new Error('unixTimestamp is required for timemachine mode.');
      }
      let data = await client.getOneCallTimemachine(
        ctx.input.latitude,
        ctx.input.longitude,
        ctx.input.unixTimestamp
      );

      let hourlyData = (data.data || []).map((h: any) => ({
        timestamp: new Date(h.dt * 1000).toISOString(),
        temperature: h.temp,
        feelsLike: h.feels_like,
        pressure: h.pressure,
        humidity: h.humidity,
        dewPoint: h.dew_point,
        cloudiness: h.clouds,
        windSpeed: h.wind_speed,
        windDirection: h.wind_deg,
        visibility: h.visibility,
        conditionGroup: h.weather?.[0]?.main,
        conditionDescription: h.weather?.[0]?.description
      }));

      return {
        output: {
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          timezoneOffset: data.timezone_offset,
          hourlyData,
          daySummary: undefined
        },
        message: `Retrieved **${hourlyData.length}** historical hourly data points for (${ctx.input.latitude}, ${ctx.input.longitude}).`
      };
    } else {
      if (!ctx.input.date) {
        throw new Error('date is required for day_summary mode (YYYY-MM-DD).');
      }
      let data = await client.getOneCallDaySummary(
        ctx.input.latitude,
        ctx.input.longitude,
        ctx.input.date
      );

      let daySummary = {
        date: data.date || ctx.input.date,
        temperatureMin: data.temperature?.min,
        temperatureMax: data.temperature?.max,
        temperatureMorning: data.temperature?.morning,
        temperatureAfternoon: data.temperature?.afternoon,
        temperatureEvening: data.temperature?.evening,
        temperatureNight: data.temperature?.night,
        pressure: data.pressure?.afternoon,
        humidity: data.humidity?.afternoon,
        windSpeed: data.wind?.max?.speed,
        precipitationTotal: data.precipitation?.total,
        cloudCoverageAfternoon: data.cloud_cover?.afternoon
      };

      return {
        output: {
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.tz,
          timezoneOffset: undefined,
          hourlyData: undefined,
          daySummary
        },
        message: `Day summary for **${daySummary.date}**: ${daySummary.temperatureMin ?? 'N/A'}°–${daySummary.temperatureMax ?? 'N/A'}°, precipitation: ${daySummary.precipitationTotal ?? 0} mm.`
      };
    }
  })
  .build();
