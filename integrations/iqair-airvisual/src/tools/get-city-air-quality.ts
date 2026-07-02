import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollutantDetailSchema = z
  .object({
    concentration: z.number().describe('Pollutant concentration in ug/m3 (CO in mg/m3)'),
    aqiUs: z.number().describe('AQI value based on US EPA standard'),
    aqiChina: z.number().describe('AQI value based on China MEP standard')
  })
  .optional();

export let getCityAirQuality = SlateTool.create(spec, {
  name: 'Get City Air Quality',
  key: 'get_city_air_quality',
  description: `Retrieve current air quality and weather data for a specific city. Returns AQI values (US and China standards), main pollutant, weather conditions (temperature, humidity, pressure, wind), and GPS coordinates. If available on your plan, also returns pollutant concentrations, forecasts, and historical data.`,
  instructions: [
    'Specify the exact country, state, and city names as they appear in the IQAir location directory. Use the "List Locations" tool to discover valid names.'
  ],
  constraints: [
    'Community plan returns current data only. Startup adds pollutant concentrations. Enterprise adds forecasts and history.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z.string().describe('Country name (e.g. "USA", "China")'),
      state: z.string().describe('State/province name (e.g. "California", "Beijing")'),
      city: z.string().describe('City name (e.g. "Los Angeles", "Beijing")')
    })
  )
  .output(
    z.object({
      city: z.string().describe('City name'),
      state: z.string().describe('State/province name'),
      country: z.string().describe('Country name'),
      longitude: z.number().describe('Longitude coordinate'),
      latitude: z.number().describe('Latitude coordinate'),
      weather: z.object({
        timestamp: z.string().describe('Measurement timestamp (ISO 8601)'),
        temperatureCelsius: z.number().describe('Temperature in Celsius'),
        pressureHpa: z.number().describe('Atmospheric pressure in hPa'),
        humidityPercent: z.number().describe('Humidity percentage'),
        windSpeedMs: z.number().describe('Wind speed in m/s'),
        windDirectionDegrees: z.number().describe('Wind direction in degrees (0-360)'),
        iconCode: z.string().describe('Weather icon code')
      }),
      pollution: z.object({
        timestamp: z.string().describe('Measurement timestamp (ISO 8601)'),
        aqiUs: z.number().describe('AQI value based on US EPA standard'),
        mainPollutantUs: z
          .string()
          .describe(
            'Main pollutant for US AQI (p2=PM2.5, p1=PM10, o3=Ozone, n2=NO2, s2=SO2, co=CO)'
          ),
        aqiChina: z.number().describe('AQI value based on China MEP standard'),
        mainPollutantChina: z.string().describe('Main pollutant for China AQI'),
        pm25: pollutantDetailSchema.describe('PM2.5 details (Startup+ plans)'),
        pm10: pollutantDetailSchema.describe('PM10 details (Startup+ plans)'),
        ozone: pollutantDetailSchema.describe('Ozone details (Startup+ plans)'),
        nitrogenDioxide: pollutantDetailSchema.describe('NO2 details (Startup+ plans)'),
        sulfurDioxide: pollutantDetailSchema.describe('SO2 details (Startup+ plans)'),
        carbonMonoxide: pollutantDetailSchema.describe('CO details (Startup+ plans)')
      }),
      forecasts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('AQI/weather forecasts (Enterprise plan)'),
      history: z
        .object({
          weather: z.array(z.record(z.string(), z.any())).optional(),
          pollution: z.array(z.record(z.string(), z.any())).optional()
        })
        .optional()
        .describe('Historical data (Enterprise plan)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching air quality data...');
    let data = await client.getCityData(ctx.input.country, ctx.input.state, ctx.input.city);

    let mapPollutant = (p?: { conc: number; aqius: number; aqicn: number }) => {
      if (!p) return undefined;
      return { concentration: p.conc, aqiUs: p.aqius, aqiChina: p.aqicn };
    };

    let output = {
      city: data.city,
      state: data.state,
      country: data.country,
      longitude: data.location.coordinates[0],
      latitude: data.location.coordinates[1],
      weather: {
        timestamp: data.current.weather.ts,
        temperatureCelsius: data.current.weather.tp,
        pressureHpa: data.current.weather.pr,
        humidityPercent: data.current.weather.hu,
        windSpeedMs: data.current.weather.ws,
        windDirectionDegrees: data.current.weather.wd,
        iconCode: data.current.weather.ic
      },
      pollution: {
        timestamp: data.current.pollution.ts,
        aqiUs: data.current.pollution.aqius,
        mainPollutantUs: data.current.pollution.mainus,
        aqiChina: data.current.pollution.aqicn,
        mainPollutantChina: data.current.pollution.maincn,
        pm25: mapPollutant(data.current.pollution.p2),
        pm10: mapPollutant(data.current.pollution.p1),
        ozone: mapPollutant(data.current.pollution.o3),
        nitrogenDioxide: mapPollutant(data.current.pollution.n2),
        sulfurDioxide: mapPollutant(data.current.pollution.s2),
        carbonMonoxide: mapPollutant(data.current.pollution.co)
      },
      forecasts: data.forecasts,
      history: data.history
    };

    let aqiLabel = getAqiLabel(output.pollution.aqiUs);

    return {
      output,
      message: `**${data.city}, ${data.state}, ${data.country}** — AQI (US): **${output.pollution.aqiUs}** (${aqiLabel}), Temperature: ${output.weather.temperatureCelsius}°C, Humidity: ${output.weather.humidityPercent}%`
    };
  })
  .build();

let getAqiLabel = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};
