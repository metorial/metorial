import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let countrySchema = z.object({
  name: z.string().nullable().describe('Country name'),
  code: z.string().nullable().describe('Country code (ISO 3166-1 alpha-2)'),
  flag: z.string().nullable().describe('Country flag URL')
});

export let getCountriesTool = SlateTool.create(spec, {
  name: 'Get Countries',
  key: 'get_countries',
  description: `Retrieve available countries and their codes for use as filters in other tools. Can search by name or code. Returns country flags and ISO codes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sport: z
        .enum([
          'football',
          'basketball',
          'baseball',
          'hockey',
          'rugby',
          'handball',
          'volleyball',
          'afl',
          'nba',
          'nfl',
          'formula-1',
          'mma'
        ])
        .optional()
        .describe('Sport to query. Defaults to the configured sport.'),
      name: z.string().optional().describe('Exact country name'),
      code: z.string().optional().describe('Country code (e.g., GB, US, FR)'),
      search: z.string().optional().describe('Search by country name (min 3 characters)')
    })
  )
  .output(
    z.object({
      countries: z.array(countrySchema),
      count: z.number().describe('Number of countries returned')
    })
  )
  .handleInvocation(async ctx => {
    let sport = ctx.input.sport ?? ctx.config.sport;
    let client = new Client({ token: ctx.auth.token, sport });

    let data = await client.getCountries({
      name: ctx.input.name,
      code: ctx.input.code,
      search: ctx.input.search
    });

    let results = (data.response ?? []).map((item: any) => ({
      name: item.name ?? null,
      code: item.code ?? null,
      flag: item.flag ?? null
    }));

    return {
      output: {
        countries: results,
        count: results.length
      },
      message: `Found **${results.length}** country/countries.`
    };
  })
  .build();
