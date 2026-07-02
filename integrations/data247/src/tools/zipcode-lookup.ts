import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let zipcodeLookup = SlateTool.create(spec, {
  name: 'Zipcode Lookup',
  key: 'zipcode_lookup',
  description: `Append ZIP+4 codes to addresses or look up address components from a ZIP code. Use **lookupType** "append" to find the 9-digit ZIP code for a given address, or "reverse" to get address components (city, state, county, etc.) from a 5 or 9 digit ZIP code.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z
        .enum(['append', 'reverse'])
        .describe(
          '"append" to find ZIP+4 from an address, or "reverse" to get address info from a ZIP code'
        ),
      address: z.string().optional().describe('Street address (required for "append" lookup)'),
      city: z.string().optional().describe('City name (required for "append" lookup)'),
      state: z
        .string()
        .optional()
        .describe('State abbreviation (required for "append" lookup)'),
      zip: z
        .string()
        .optional()
        .describe('5 or 9 digit ZIP code (required for "reverse" lookup)')
    })
  )
  .output(
    z.object({
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('5-digit ZIP code'),
      zip4: z.string().optional().describe('ZIP+4 code'),
      county: z.string().optional().describe('County name'),
      fips: z.string().optional().describe('FIPS code'),
      congressDist: z.string().optional().describe('Congressional district'),
      areaCode: z.string().optional().describe('Area code'),
      timezone: z.string().optional().describe('Timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { lookupType } = ctx.input;

    let raw: Record<string, string>;

    if (lookupType === 'append') {
      if (!ctx.input.address || !ctx.input.city || !ctx.input.state) {
        throw new Error('Address, city, and state are required for zipcode append lookup.');
      }
      raw = await client.zipcodeAppend({
        address: ctx.input.address,
        city: ctx.input.city,
        state: ctx.input.state
      });
    } else {
      if (!ctx.input.zip) {
        throw new Error('ZIP code is required for reverse zipcode lookup.');
      }
      raw = await client.reverseZipcode(ctx.input.zip);
    }

    let result = {
      address: raw.address,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      zip4: raw.zip4,
      county: raw.county,
      fips: raw.FIPS || raw.fips,
      congressDist: raw.congress_dist,
      areaCode: raw.areacode,
      timezone: raw.timezone
    };

    return {
      output: result,
      message:
        lookupType === 'append'
          ? `Appended ZIP+4 code: **${result.zip || ''}${result.zip4 ? `-${result.zip4}` : ''}**.`
          : `Resolved ZIP code **${ctx.input.zip}** to **${result.city || ''}, ${result.state || ''}**.`
    };
  })
  .build();
