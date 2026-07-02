import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressVerificationClient } from '../lib/address-client';
import { spec } from '../spec';

let structuredAddressSchema = z
  .object({
    line1: z.string().describe('Primary street address'),
    line2: z.string().optional().describe('Secondary address line'),
    city: z.string().optional().describe('City'),
    provinceOrState: z.string().optional().describe('Province or state'),
    postalOrZip: z.string().optional().describe('Postal or ZIP code'),
    country: z.string().optional().describe('Two-letter country code (e.g., us, ca)')
  })
  .describe('Structured address');

export let verifyAddress = SlateTool.create(spec, {
  name: 'Verify Address',
  key: 'verify_address',
  description: `Verify and standardize a US or Canadian postal address using PostGrid's CASS/SERP-certified database. Accepts either a freeform address string or structured address fields. Returns the standardized address and verification status.`,
  instructions: [
    'Provide either a freeform address string OR structured address fields, not both.',
    'For international addresses, use the **Verify International Address** tool instead.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      freeformAddress: z
        .string()
        .optional()
        .describe(
          'Full address as a single string (e.g., "145 Mulberry St, New York, NY 10013")'
        ),
      structuredAddress: structuredAddressSchema
        .optional()
        .describe('Structured address fields'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include parsed address details (street name, type, county, etc.)'),
      properCase: z
        .boolean()
        .optional()
        .describe('Return addresses in proper case instead of uppercase'),
      geocode: z
        .boolean()
        .optional()
        .describe('Include latitude and longitude (counts as 2 lookups)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Verification status: verified, corrected, or failed'),
      line1: z.string().optional().nullable().describe('Standardized primary address line'),
      line2: z.string().optional().nullable().describe('Standardized secondary address line'),
      city: z.string().optional().nullable().describe('Standardized city'),
      provinceOrState: z
        .string()
        .optional()
        .nullable()
        .describe('Standardized province or state'),
      postalOrZip: z
        .string()
        .optional()
        .nullable()
        .describe('Standardized postal or ZIP code'),
      country: z.string().optional().nullable().describe('Country code'),
      countryName: z.string().optional().nullable().describe('Full country name'),
      errors: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Corrections or errors found during verification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressVerificationClient(ctx.auth.token);

    let address:
      | string
      | {
          line1: string;
          line2?: string;
          city?: string;
          provinceOrState?: string;
          postalOrZip?: string;
          country?: string;
        };
    if (ctx.input.freeformAddress) {
      address = ctx.input.freeformAddress;
    } else if (ctx.input.structuredAddress) {
      address = ctx.input.structuredAddress;
    } else {
      throw new Error('Provide either freeformAddress or structuredAddress.');
    }

    let result = await client.verifyAddress(address, {
      includeDetails: ctx.input.includeDetails,
      properCase: ctx.input.properCase,
      geocode: ctx.input.geocode
    });

    let verified = result.data;

    return {
      output: {
        status: verified.status,
        line1: verified.line1,
        line2: verified.line2,
        city: verified.city,
        provinceOrState: verified.provinceOrState,
        postalOrZip: verified.postalOrZip,
        country: verified.country,
        countryName: verified.countryName,
        errors: verified.errors
      },
      message: `Address verification result: **${verified.status}** — ${verified.line1}, ${verified.city}, ${verified.provinceOrState} ${verified.postalOrZip}.`
    };
  })
  .build();

export let verifyInternationalAddress = SlateTool.create(spec, {
  name: 'Verify International Address',
  key: 'verify_international_address',
  description: `Verify and standardize an international postal address across 245+ countries using PostGrid. Accepts either a freeform address string or structured address fields.`,
  instructions: [
    'Provide either a freeform address string OR structured address fields.',
    'For US/Canadian addresses, you may use the standard **Verify Address** tool instead.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      freeformAddress: z.string().optional().describe('Full address as a single string'),
      structuredAddress: structuredAddressSchema
        .optional()
        .describe('Structured address fields'),
      includeDetails: z.boolean().optional().describe('Include parsed address details'),
      properCase: z.boolean().optional().describe('Return addresses in proper case'),
      geoData: z.boolean().optional().describe('Include geographic data')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Verification status code'),
      line1: z.string().optional().nullable().describe('Standardized primary address line'),
      line2: z.string().optional().nullable().describe('Standardized secondary address line'),
      city: z.string().optional().nullable().describe('Standardized city'),
      provinceOrState: z
        .string()
        .optional()
        .nullable()
        .describe('Standardized province or state'),
      postalOrZip: z
        .string()
        .optional()
        .nullable()
        .describe('Standardized postal or ZIP code'),
      country: z.string().optional().nullable().describe('Country code'),
      countryName: z.string().optional().nullable().describe('Full country name'),
      errors: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Corrections or errors found during verification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressVerificationClient(ctx.auth.token);

    let address:
      | string
      | {
          line1: string;
          line2?: string;
          city?: string;
          provinceOrState?: string;
          postalOrZip?: string;
          country?: string;
        };
    if (ctx.input.freeformAddress) {
      address = ctx.input.freeformAddress;
    } else if (ctx.input.structuredAddress) {
      address = ctx.input.structuredAddress;
    } else {
      throw new Error('Provide either freeformAddress or structuredAddress.');
    }

    let result = await client.verifyInternationalAddress(address, {
      includeDetails: ctx.input.includeDetails,
      properCase: ctx.input.properCase,
      geoData: ctx.input.geoData
    });

    let verified = result.data;

    return {
      output: {
        status: verified.status,
        line1: verified.line1,
        line2: verified.line2,
        city: verified.city,
        provinceOrState: verified.provinceOrState,
        postalOrZip: verified.postalOrZip,
        country: verified.country,
        countryName: verified.countryName,
        errors: verified.errors
      },
      message: `International address verification result: **${verified.status}** — ${verified.line1}, ${verified.city}, ${verified.provinceOrState} ${verified.postalOrZip}.`
    };
  })
  .build();
