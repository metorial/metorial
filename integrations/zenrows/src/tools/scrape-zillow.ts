import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeZillow = SlateTool.create(spec, {
  name: 'Scrape Zillow Property',
  key: 'scrape_zillow',
  description: `Extract structured property data from Zillow by ZPID. Returns detailed real estate information including address, price, Zestimate, property type, bedrooms, bathrooms, lot size, listing status, agent details, tax records, and more.`,
  instructions: [
    'The **zpid** can be found in the Zillow property URL (e.g. in "https://www.zillow.com/homedetails/123_zpid", the ZPID is "123").'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      zpid: z.string().describe('Zillow Property ID (ZPID) — found in the property URL'),
      country: z.string().optional().describe('Country code for localized data (e.g. "us")')
    })
  )
  .output(
    z.object({
      results: z
        .record(z.string(), z.unknown())
        .describe('Structured property data from Zillow')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getZillowProperty({
      zpid: ctx.input.zpid,
      country: ctx.input.country
    });

    let address = results.address || results.property_url || ctx.input.zpid;

    return {
      output: { results },
      message: `Retrieved Zillow property data for ZPID **${ctx.input.zpid}** (${address}).`
    };
  })
  .build();
