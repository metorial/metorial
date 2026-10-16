import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCities = SlateTool.create(spec, {
  name: 'Search Cities',
  key: 'search_cities',
  description:
    'Search cities by name, country, or population range and retrieve coordinates, population, and capital status.',
  constraints: ['Expanded city coverage, limit, and offset require a premium plan.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('City name'),
      country: z.string().length(2).optional().describe('ISO 3166 two-letter country code'),
      minPopulation: z.number().int().min(0).optional().describe('Minimum population'),
      maxPopulation: z.number().int().min(0).optional().describe('Maximum population'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe('Results per page; premium only'),
      offset: z.number().int().min(0).optional().describe('Results to skip; premium only')
    })
  )
  .output(
    z.object({
      cities: z.array(
        z.object({
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          country: z.string(),
          population: z.number().optional(),
          isCapital: z.boolean().optional(),
          raw: z.unknown().optional().describe('Original city response')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.name?.trim() &&
      !ctx.input.country &&
      ctx.input.minPopulation === undefined &&
      ctx.input.maxPopulation === undefined
    ) {
      throw createApiServiceError('Provide a city name, country, or population range.');
    }
    let result = await new Client(ctx.auth).getCity(
      pickDefined({
        name: ctx.input.name,
        country: ctx.input.country,
        min_population: ctx.input.minPopulation,
        max_population: ctx.input.maxPopulation,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })
    );
    return {
      output: {
        cities: result.map(
          (city: {
            name: string;
            latitude: number;
            longitude: number;
            country: string;
            population?: number | null;
            is_capital?: boolean | null;
          }) => ({
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            country: city.country,
            population: city.population ?? undefined,
            isCapital: city.is_capital ?? undefined,
            raw: city
          })
        )
      },
      message: `Found ${result.length} matching cities.`
    };
  })
  .build();
