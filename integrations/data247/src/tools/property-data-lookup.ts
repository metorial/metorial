import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let propertyDataLookup = SlateTool.create(spec, {
  name: 'Property Data Lookup',
  key: 'property_data_lookup',
  description: `Look up property ownership and details for a USA postal address. Returns the owner's name, home statistics, last sold date and amount, appraisal value, foreclosure status, and more. Useful for confirming property ownership and getting real estate data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('Street address of the property'),
      city: z.string().describe('City'),
      state: z.string().describe('State abbreviation'),
      zip: z.string().describe('ZIP code')
    })
  )
  .output(
    z.object({
      ownerName: z.string().optional().describe('Name of the property owner'),
      address: z.string().optional().describe('Property address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP code'),
      propertyAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Property details including home statistics, sold date, appraisal value, foreclosure status'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { address, city, state, zip } = ctx.input;

    let raw = await client.propertyData({ address, city, state, zip });

    let { owner_name, address: addr, city: c, state: s, zip: z2, ...rest } = raw;

    let result = {
      ownerName: owner_name,
      address: addr,
      city: c,
      state: s,
      zip: z2,
      propertyAttributes: Object.keys(rest).length > 0 ? rest : undefined
    };

    return {
      output: result,
      message: `Retrieved property data for **${address}, ${city}, ${state} ${zip}**.`
    };
  })
  .build();
