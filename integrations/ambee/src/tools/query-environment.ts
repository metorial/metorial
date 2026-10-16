import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateHistoryRange } from '../lib/validation';
import { spec } from '../spec';

export let queryEnvironment = SlateTool.create(spec, {
  name: 'Query Environmental Data',
  key: 'query_environment',
  description:
    'Query current v3 air quality, pollen, or weather data by coordinates or place name. Retrieve latest readings, hourly history, or forecasts. Weather and pollen also offer a 120-hour forecast at three-hour intervals.',
  constraints: [
    'Historical queries require from and to with a maximum 48-hour window.',
    'Air quality forecasts cover 48 hours. Pollen and weather forecasts cover 48 or 120 hours.',
    'Data availability depends on the location and API subscription.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataset: z
        .enum(['aq', 'pollen', 'weather'])
        .describe('Environmental dataset; aq means air quality'),
      period: z.enum(['latest', 'history', 'forecast']).describe('Readings to retrieve'),
      lat: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Latitude; provide with lng instead of place'),
      lng: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Longitude; provide with lat instead of place'),
      place: z
        .string()
        .optional()
        .describe('Place or address; provide instead of coordinates'),
      from: z
        .string()
        .optional()
        .describe('Required for history: start in YYYY-MM-DD HH:mm:ss format'),
      to: z
        .string()
        .optional()
        .describe('Required for history: end in YYYY-MM-DD HH:mm:ss format'),
      forecastHours: z
        .number()
        .optional()
        .describe('Forecast only: 48 (default) or 120; air quality supports only 48'),
      locale: z.boolean().optional().describe('Include localTime in the response'),
      aqiStandard: z
        .enum(['EPA', 'IN', 'UK', 'CN', 'CA'])
        .optional()
        .describe('Air quality only: AQI calculation standard'),
      speciesRisk: z
        .boolean()
        .optional()
        .describe('Pollen only: include species-level risk where available')
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe('Complete provider response, including data and location metadata')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let hasCoordinates = input.lat !== undefined && input.lng !== undefined;
    if ((input.lat === undefined) !== (input.lng === undefined)) {
      throw createApiServiceError('Provide both lat and lng.');
    }
    if (Number(hasCoordinates) + Number(Boolean(input.place?.trim())) !== 1) {
      throw createApiServiceError(
        'Provide either lat/lng coordinates or a non-empty place name.'
      );
    }
    if (input.period === 'history') {
      if (input.from === undefined || input.to === undefined) {
        throw createApiServiceError('Historical queries require both from and to.');
      }
      validateHistoryRange(input.from, input.to, 48);
    } else if (input.from !== undefined || input.to !== undefined) {
      throw createApiServiceError('Use from and to only with period history.');
    }
    let hours = input.forecastHours ?? 48;
    if (hours !== 48 && hours !== 120) {
      throw createApiServiceError('forecastHours must be 48 or 120.');
    }
    if (input.forecastHours !== undefined && input.period !== 'forecast') {
      throw createApiServiceError('Use forecastHours only with period forecast.');
    }
    if (input.dataset === 'aq' && hours === 120) {
      throw createApiServiceError('Air quality forecasts support 48 hours only.');
    }
    if (input.aqiStandard !== undefined && input.dataset !== 'aq') {
      throw createApiServiceError('Use aqiStandard only with dataset aq.');
    }
    if (input.speciesRisk !== undefined && input.dataset !== 'pollen') {
      throw createApiServiceError('Use speciesRisk only with dataset pollen.');
    }

    let client = new Client({ token: ctx.auth.token, language: ctx.config.language });
    let response = await client.queryEnvironment(input.dataset, input.period, hours, {
      lat: input.lat,
      lng: input.lng,
      place: input.place?.trim(),
      from: input.from,
      to: input.to,
      locale: input.locale,
      aqiStandard: input.aqiStandard,
      speciesRisk: input.speciesRisk,
      units: input.dataset === 'weather' && ctx.config.units === 'si' ? 'si' : undefined
    });
    return {
      output: { response },
      message: `Retrieved ${input.period} ${input.dataset} data.`
    };
  })
  .build();
