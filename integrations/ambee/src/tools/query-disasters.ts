import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryDisasters = SlateTool.create(spec, {
  name: 'Query Disaster Events',
  key: 'query_disasters',
  description:
    'Retrieve processed natural disaster events from the last month by coordinates, country, or continent, or retrieve the affected polygon for a known event. Includes wildfire events and preserves the complete provider response.',
  instructions: [
    'Use action latest to discover event IDs, then action polygon with an eventId to retrieve affected geometry.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      action: z
        .enum(['latest', 'polygon'])
        .describe('List recent events or retrieve an event polygon'),
      lat: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Latest only: latitude, paired with lng'),
      lng: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Latest only: longitude, paired with lat'),
      countryCode: z
        .string()
        .optional()
        .describe('Latest only: country code, instead of coordinates or continent'),
      continent: z
        .enum(['AFR', 'ANT', 'ASIA', 'AUS', 'EUR', 'NAR', 'SAR', 'Ocean'])
        .optional()
        .describe('Latest only: continent code, instead of coordinates or country'),
      eventType: z
        .enum(['EQ', 'TN', 'TC', 'WF', 'FL', 'ET', 'DR', 'SW', 'SI', 'VO', 'LS', 'Misc'])
        .optional()
        .describe('Latest only: filter events by type; WF means wildfire'),
      limit: z
        .number()
        .optional()
        .describe('Latest only: positive whole number of records per page'),
      page: z
        .number()
        .optional()
        .describe('Latest only: positive whole page number, starting at 1'),
      eventId: z
        .string()
        .optional()
        .describe('Polygon only: event ID returned by action latest')
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe('Complete provider response, including event details or geometry')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new Client({ token: ctx.auth.token, language: ctx.config.language });
    if (input.action === 'polygon') {
      if (!input.eventId?.trim()) {
        throw createApiServiceError(
          'Provide an eventId from query_disasters with action latest.'
        );
      }
      if (
        [
          input.lat,
          input.lng,
          input.countryCode,
          input.continent,
          input.eventType,
          input.limit,
          input.page
        ].some(value => value !== undefined)
      ) {
        throw createApiServiceError('Use only eventId with action polygon.');
      }
      let response = await client.queryDisasters('polygon', { eventId: input.eventId.trim() });
      return { output: { response }, message: 'Retrieved disaster event geometry.' };
    }
    if (input.eventId !== undefined) {
      throw createApiServiceError('Use eventId only with action polygon.');
    }
    if ((input.lat === undefined) !== (input.lng === undefined)) {
      throw createApiServiceError('Provide both lat and lng.');
    }
    let hasCoordinates = input.lat !== undefined && input.lng !== undefined;
    if (
      Number(hasCoordinates) +
        Number(Boolean(input.countryCode?.trim())) +
        Number(input.continent !== undefined) !==
      1
    ) {
      throw createApiServiceError(
        'Provide exactly one of lat/lng, countryCode, or continent.'
      );
    }
    let path: 'latest/by-lat-lng' | 'latest/by-continent' | 'latest/by-country-code' =
      hasCoordinates
        ? 'latest/by-lat-lng'
        : input.continent
          ? 'latest/by-continent'
          : 'latest/by-country-code';
    let response = await client.queryDisasters(path, {
      lat: input.lat,
      lng: input.lng,
      countryCode: input.countryCode?.trim(),
      continent: input.continent,
      eventType: input.eventType,
      limit: input.limit,
      page: input.page
    });
    return { output: { response }, message: 'Retrieved recent natural disaster events.' };
  })
  .build();
