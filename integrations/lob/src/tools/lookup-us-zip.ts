import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupUSZip = SlateTool.create(spec, {
  name: 'Lookup US ZIP Code',
  key: 'lookup_us_zip',
  description:
    'Look up the cities, state, county, and ZIP type associated with a five-digit US ZIP code.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      zipCode: z
        .string()
        .regex(/^\d{5}$/)
        .describe('Five-digit US ZIP code')
    })
  )
  .output(
    z.object({
      lookupId: z.string(),
      zipCode: z.string(),
      zipCodeType: z.string(),
      cities: z.array(
        z.object({
          city: z.string(),
          state: z.string(),
          county: z.string(),
          countyFips: z.string(),
          preferred: z.boolean()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).zipCodeLookup(ctx.input);
    return {
      output: {
        lookupId: result.id,
        zipCode: result.zip_code,
        zipCodeType: result.zip_code_type,
        cities: result.cities.map(
          (city: {
            city: string;
            state: string;
            county: string;
            county_fips: string;
            preferred: boolean;
          }) => ({
            city: city.city,
            state: city.state,
            county: city.county,
            countyFips: city.county_fips,
            preferred: city.preferred
          })
        )
      },
      message: `Found **${result.cities.length}** cities for ZIP code **${result.zip_code}**`
    };
  });
