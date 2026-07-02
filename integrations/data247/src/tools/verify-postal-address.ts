import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyPostalAddress = SlateTool.create(spec, {
  name: 'Verify Postal Address',
  key: 'verify_postal_address',
  description: `Verify and standardize USA postal addresses against USPS standards. If the address is incorrect, a corrected and standardized version is returned. Returns parsed address components including street, city, state, ZIP+4, county, congressional district, area code, and timezone.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('Street address to verify'),
      city: z.string().describe('City name'),
      state: z.string().describe('State abbreviation (e.g., "MA", "CA")'),
      zip: z.string().describe('ZIP code')
    })
  )
  .output(
    z.object({
      valid: z.string().optional().describe('Whether the address is valid ("YES" or "NO")'),
      addr1: z.string().optional().describe('Primary address line'),
      addr2: z.string().optional().describe('Secondary address line'),
      predir: z.string().optional().describe('Pre-directional (e.g., "N", "S")'),
      streetNum: z.string().optional().describe('Street number'),
      postdir: z.string().optional().describe('Post-directional'),
      street: z.string().optional().describe('Street name'),
      streetSuffix: z.string().optional().describe('Street suffix (e.g., "St", "Ave")'),
      unit: z.string().optional().describe('Unit or apartment number'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State abbreviation'),
      zip: z.string().optional().describe('5-digit ZIP code'),
      zip4: z.string().optional().describe('ZIP+4 code'),
      county: z.string().optional().describe('County name'),
      fips: z.string().optional().describe('FIPS code'),
      congressDist: z.string().optional().describe('Congressional district'),
      areaCode: z.string().optional().describe('Area code for the address'),
      timezone: z.string().optional().describe('Timezone'),
      dpbc: z.string().optional().describe('Delivery Point Barcode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let raw = await client.verifyPostalAddress({
      address: ctx.input.address,
      city: ctx.input.city,
      state: ctx.input.state,
      zip: ctx.input.zip
    });

    let result = {
      valid: raw.valid,
      addr1: raw.addr1,
      addr2: raw.addr2,
      predir: raw.predir,
      streetNum: raw.streetnum,
      postdir: raw.postdir,
      street: raw.street,
      streetSuffix: raw.street_suffix,
      unit: raw.unit,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      zip4: raw.zip4,
      county: raw.county,
      fips: raw.FIPS || raw.fips,
      congressDist: raw.congress_dist,
      areaCode: raw.areacode,
      timezone: raw.timezone,
      dpbc: raw.DPBC || raw.dpbc
    };

    return {
      output: result,
      message: `Address verification: **${result.valid || 'Unknown'}**. ${result.valid === 'YES' ? 'Address is valid.' : 'Address may need correction.'}`
    };
  })
  .build();
