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

export let getStationAirQuality = SlateTool.create(spec, {
  name: 'Get Station Air Quality',
  key: 'get_station_air_quality',
  description: `Retrieve air quality and weather data at the monitoring station level. Supports two modes: specify a station by name (along with city, state, country), or find the nearest station to GPS coordinates / IP location. Station-level data provides more granular pollutant concentration readings than city-level data.`,
  instructions: [
    'To look up a specific station, provide station, city, state, and country. Use "List Locations" to discover available stations.',
    'To find the nearest station, omit the station/city/state/country fields and optionally provide latitude and longitude.'
  ],
  constraints: ['Requires a Startup or Enterprise plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      station: z
        .string()
        .optional()
        .describe('Station name (e.g. "US Embassy"). Required for specific station lookup.'),
      city: z.string().optional().describe('City name. Required for specific station lookup.'),
      state: z
        .string()
        .optional()
        .describe('State/province name. Required for specific station lookup.'),
      country: z
        .string()
        .optional()
        .describe('Country name. Required for specific station lookup.'),
      latitude: z
        .number()
        .optional()
        .describe('Latitude for nearest station lookup. Omit for IP-based geolocation.'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude for nearest station lookup. Omit for IP-based geolocation.')
    })
  )
  .output(
    z.object({
      station: z.string().optional().describe('Station name'),
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
        mainPollutantUs: z.string().describe('Main pollutant for US AQI'),
        aqiChina: z.number().describe('AQI value based on China MEP standard'),
        mainPollutantChina: z.string().describe('Main pollutant for China AQI'),
        pm25: pollutantDetailSchema.describe('PM2.5 details'),
        pm10: pollutantDetailSchema.describe('PM10 details'),
        ozone: pollutantDetailSchema.describe('Ozone details'),
        nitrogenDioxide: pollutantDetailSchema.describe('NO2 details'),
        sulfurDioxide: pollutantDetailSchema.describe('SO2 details'),
        carbonMonoxide: pollutantDetailSchema.describe('CO details')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { station, city, state, country, latitude, longitude } = ctx.input;

    let data: any;
    if (station && city && state && country) {
      ctx.progress(`Fetching data for station "${station}"...`);
      data = await client.getStationData(country, state, city, station);
    } else {
      let method = latitude !== undefined ? 'GPS coordinates' : 'IP geolocation';
      ctx.progress(`Finding nearest station via ${method}...`);
      data = await client.getNearestStation(latitude, longitude);
    }

    let mapPollutant = (p?: { conc: number; aqius: number; aqicn: number }) => {
      if (!p) return undefined;
      return { concentration: p.conc, aqiUs: p.aqius, aqiChina: p.aqicn };
    };

    let output = {
      station: data.station,
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
      }
    };

    let stationLabel = output.station ? `Station: ${output.station}, ` : '';
    let aqiLabel = getAqiLabel(output.pollution.aqiUs);

    return {
      output,
      message: `${stationLabel}**${data.city}, ${data.state}, ${data.country}** — AQI (US): **${output.pollution.aqiUs}** (${aqiLabel}), Temperature: ${output.weather.temperatureCelsius}°C`
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
