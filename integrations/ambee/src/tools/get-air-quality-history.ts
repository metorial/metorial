import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let historicalAqRecordSchema = z
  .object({
    CO: z.number().optional().describe('Carbon monoxide concentration (ppm)'),
    NO2: z.number().optional().describe('Nitrogen dioxide concentration (ppb)'),
    OZONE: z.number().optional().describe('Ozone concentration (ppb)'),
    PM10: z.number().optional().describe('Particulate matter < 10µm (µg/m³)'),
    PM25: z.number().optional().describe('Particulate matter < 2.5µm (µg/m³)'),
    SO2: z.number().optional().describe('Sulfur dioxide concentration (ppb)'),
    AQI: z.number().optional().describe('Air Quality Index value'),
    lat: z.number().optional().describe('Latitude'),
    lng: z.number().optional().describe('Longitude'),
    createdAt: z.string().optional().describe('Record timestamp'),
    postalCode: z.string().optional().describe('Postal code'),
    majorPollutant: z.string().optional().describe('Major pollutant at this time')
  })
  .passthrough();

export let getAirQualityHistory = SlateTool.create(spec, {
  name: 'Get Air Quality History',
  key: 'get_air_quality_history',
  description: `Retrieve historical air quality data for a location. Returns hourly AQI and pollutant concentrations within a specified time period. Query by coordinates or postal code.`,
  constraints: [
    'Maximum query window is 48 hours.',
    'Timestamps must be in format "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      postalCode: z.string().optional().describe('Postal code to query'),
      countryCode: z
        .string()
        .optional()
        .describe('ISO country code (required with postalCode)'),
      from: z.string().describe('Start timestamp in "YYYY-MM-DD HH:mm:ss" format'),
      to: z.string().describe('End timestamp in "YYYY-MM-DD HH:mm:ss" format')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        records: z.array(historicalAqRecordSchema).describe('Historical air quality records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.postalCode && ctx.input.countryCode) {
      result = await client.getAirQualityHistoryByPostalCode(
        ctx.input.postalCode,
        ctx.input.countryCode,
        ctx.input.from,
        ctx.input.to
      );
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getAirQualityHistoryByLatLng(
        ctx.input.lat,
        ctx.input.lng,
        ctx.input.from,
        ctx.input.to
      );
    } else {
      throw new Error('Provide lat/lng coordinates or postalCode with countryCode.');
    }

    let records = result.data || result.stations || [];

    return {
      output: {
        message: result.message,
        records
      },
      message: `Retrieved **${records.length}** historical air quality record(s) from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
