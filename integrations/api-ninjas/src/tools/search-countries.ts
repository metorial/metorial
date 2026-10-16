import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCountries = SlateTool.create(spec, {
  name: 'Search Countries',
  key: 'search_countries',
  description:
    'Find country statistics by name, ISO code, currency, or population range. Country populations are reported in thousands.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('English country name or two- or three-letter ISO code'),
      currency: z.string().optional().describe('Three-letter currency code'),
      minPopulation: z.number().min(0).optional().describe('Minimum population, in thousands'),
      maxPopulation: z.number().min(0).optional().describe('Maximum population, in thousands'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe('Maximum results; provider default is 5')
    })
  )
  .output(
    z.object({
      countries: z.array(
        z.object({
          name: z.string().optional(),
          iso2: z.string().optional(),
          capital: z.string().optional(),
          region: z.string().optional(),
          populationThousands: z.number().optional(),
          gdpMillionsUsd: z.number().optional(),
          currencyCode: z.string().optional(),
          raw: z.unknown().optional().describe('Original country statistics')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getCountry(
      pickDefined({
        name: ctx.input.name,
        currency: ctx.input.currency,
        min_population: ctx.input.minPopulation,
        max_population: ctx.input.maxPopulation,
        limit: ctx.input.limit
      })
    );
    return {
      output: {
        countries: result.map(
          (country: {
            name?: string | null;
            iso2?: string | null;
            capital?: string | null;
            region?: string | null;
            population?: number | null;
            gdp?: number | null;
            currency?: { code?: string | null } | null;
          }) => ({
            name: country.name ?? undefined,
            iso2: country.iso2 ?? undefined,
            capital: country.capital ?? undefined,
            region: country.region ?? undefined,
            populationThousands: country.population ?? undefined,
            gdpMillionsUsd: country.gdp ?? undefined,
            currencyCode: country.currency?.code ?? undefined,
            raw: country
          })
        )
      },
      message: `Found ${result.length} matching countries.`
    };
  })
  .build();
