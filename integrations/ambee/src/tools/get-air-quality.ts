import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let airQualityStationSchema = z
  .object({
    CO: z.number().optional().describe('Carbon monoxide concentration (ppm)'),
    NO2: z.number().optional().describe('Nitrogen dioxide concentration (ppb)'),
    OZONE: z.number().optional().describe('Ozone concentration (ppb)'),
    PM10: z.number().optional().describe('Particulate matter < 10µm (µg/m³)'),
    PM25: z.number().optional().describe('Particulate matter < 2.5µm (µg/m³)'),
    SO2: z.number().optional().describe('Sulfur dioxide concentration (ppb)'),
    AQI: z.number().optional().describe('Air Quality Index value'),
    city: z.string().optional().describe('City name'),
    countryCode: z.string().optional().describe('Country code'),
    division: z.string().optional().describe('Administrative division'),
    lat: z.number().optional().describe('Latitude'),
    lng: z.number().optional().describe('Longitude'),
    placeName: z.string().optional().describe('Place name'),
    postalCode: z.string().optional().describe('Postal code'),
    state: z.string().optional().describe('State or province'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    aqiInfo: z
      .object({
        pollutant: z.string().optional().describe('Major pollutant'),
        concentration: z.number().optional().describe('Major pollutant concentration'),
        category: z
          .string()
          .optional()
          .describe('AQI category (Good, Moderate, Unhealthy, etc.)')
      })
      .optional()
      .describe('AQI breakdown info')
  })
  .passthrough();

export let getAirQuality = SlateTool.create(spec, {
  name: 'Get Air Quality',
  key: 'get_air_quality',
  description: `Retrieve real-time air quality data including AQI, pollutant concentrations (CO, NO2, O₃, PM10, PM2.5, SO₂), and major pollutant information. Supports lookup by coordinates, city name, postal code, or country code.`,
  constraints: ['Data window for history queries is limited to 48 hours.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      city: z.string().optional().describe('City name to query'),
      postalCode: z.string().optional().describe('Postal code to query'),
      countryCode: z
        .string()
        .optional()
        .describe(
          'ISO country code (used with postalCode or standalone for country-level data)'
        ),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (for city or country queries)')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        stations: z.array(airQualityStationSchema).describe('Air quality measurement stations')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.city) {
      result = await client.getAirQualityByCity(ctx.input.city, ctx.input.limit);
    } else if (ctx.input.postalCode && ctx.input.countryCode) {
      result = await client.getAirQualityByPostalCode(
        ctx.input.postalCode,
        ctx.input.countryCode
      );
    } else if (ctx.input.countryCode && !ctx.input.lat) {
      result = await client.getAirQualityByCountryCode(ctx.input.countryCode, ctx.input.limit);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getAirQualityByLatLng(ctx.input.lat, ctx.input.lng);
    } else {
      throw new Error(
        'Provide lat/lng coordinates, a city name, a postalCode with countryCode, or a countryCode.'
      );
    }

    let stations = result.stations || [];
    let summary =
      stations.length > 0
        ? `Retrieved air quality data for **${stations.length}** station(s). Average AQI: **${Math.round(stations.reduce((s: number, st: any) => s + (st.AQI || 0), 0) / stations.length)}**.`
        : 'No air quality stations found for the specified location.';

    return {
      output: {
        message: result.message,
        stations
      },
      message: summary
    };
  })
  .build();
