import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupCityState = SlateTool.create(spec, {
  name: 'Lookup City and State',
  key: 'lookup_city_state',
  description:
    'Find US or Canadian cities and states or provinces associated with a postal or ZIP code, including available county and mailability information.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      postalOrZip: z.string().min(1).describe('US ZIP code or Canadian postal code')
    })
  )
  .output(
    z.object({
      locations: z.array(
        z.object({
          city: z.string().describe('City'),
          country: z.string().describe('ISO 2-letter country code'),
          provinceOrState: z.string().describe('Province or state abbreviation'),
          county: z.string().optional().describe('County for US locations'),
          countyFIPS: z.string().optional().describe('County FIPS code'),
          mailable: z.boolean().optional().describe('Whether the location is mailable'),
          preferredCity: z.string().optional().describe('USPS preferred city'),
          zipClass: z.string().optional().describe('USPS ZIP code class')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let locations = await new Client({ token: ctx.auth.token }).lookupCityState(
      ctx.input.postalOrZip
    );
    return {
      output: { locations },
      message: `Found ${locations.length} location(s) for ${ctx.input.postalOrZip}.`
    };
  })
  .build();
