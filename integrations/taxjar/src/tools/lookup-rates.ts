import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupRates = SlateTool.create(spec, {
  name: 'Look Up Tax Rates',
  key: 'lookup_rates',
  description: `Retrieve the combined sales tax rate for a US location by ZIP code. Returns rates broken down by state, county, city, and combined district. Optionally provide city, state, and street address for greater accuracy.`,
  instructions: [
    'At minimum provide a ZIP code. Add state, city, and street for the most accurate rate.'
  ],
  constraints: [
    'Does not account for nexus, sourcing, shipping taxability, product exemptions, customer exemptions, or sales tax holidays.',
    'For accurate tax calculations on actual orders, use the Calculate Sales Tax tool instead.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zip: z.string().describe('US ZIP code to look up rates for'),
      country: z.string().optional().describe('Two-letter ISO country code (default: US)'),
      state: z.string().optional().describe('Two-letter state code for more accurate results'),
      city: z.string().optional().describe('City name for more accurate results'),
      street: z.string().optional().describe('Street address for rooftop-level accuracy')
    })
  )
  .output(
    z.object({
      zip: z.string().describe('ZIP code'),
      state: z.string().describe('State name'),
      stateRate: z.string().describe('State tax rate'),
      county: z.string().describe('County name'),
      countyRate: z.string().describe('County tax rate'),
      city: z.string().describe('City name'),
      cityRate: z.string().describe('City tax rate'),
      combinedDistrictRate: z.string().describe('Combined special district rate'),
      combinedRate: z.string().describe('Total combined tax rate'),
      freightTaxable: z
        .boolean()
        .describe('Whether freight/shipping is taxable at this location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getRatesForLocation(ctx.input.zip, {
      country: ctx.input.country,
      state: ctx.input.state,
      city: ctx.input.city,
      street: ctx.input.street
    });

    let output = {
      zip: result.zip,
      state: result.state,
      stateRate: result.state_rate,
      county: result.county,
      countyRate: result.county_rate,
      city: result.city,
      cityRate: result.city_rate,
      combinedDistrictRate: result.combined_district_rate,
      combinedRate: result.combined_rate,
      freightTaxable: result.freight_taxable
    };

    return {
      output,
      message: `Tax rate for **${result.zip}** (${result.city}, ${result.state}): combined rate **${(Number.parseFloat(result.combined_rate) * 100).toFixed(2)}%**. Freight taxable: ${result.freight_taxable ? 'Yes' : 'No'}.`
    };
  })
  .build();
