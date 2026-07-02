import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let structuredAddressSchema = z.object({
  line1: z.string().describe('Primary street address line'),
  line2: z.string().optional().describe('Secondary address line'),
  city: z.string().optional().describe('City name'),
  provinceOrState: z.string().optional().describe('Province or state'),
  postalOrZip: z.string().optional().describe('Postal or ZIP code'),
  country: z.string().optional().describe('Country code (ISO 2-letter, e.g. "GB", "DE", "JP")')
});

let summarySchema = z
  .object({
    status: z
      .string()
      .describe(
        'Verification status code (V=Verified, P=Partial, U=Unverified, A=Ambiguous, C=Conflict, R=Reverted)'
      ),
    inputMatchLevel: z.string().optional().describe('Match level of the input'),
    verifiedMatchLevel: z.string().optional().describe('Match level of the verified address'),
    parsingStatus: z.string().optional().describe('Address parsing status')
  })
  .optional()
  .describe('Verification summary with status and match scores');

let geoDataSchema = z
  .object({
    latitude: z.number().optional().describe('Latitude coordinate'),
    longitude: z.number().optional().describe('Longitude coordinate'),
    accuracy: z.string().optional().describe('Accuracy description')
  })
  .optional()
  .describe('Geographic coordinates (only if geoData option enabled)');

export let verifyInternationalAddress = SlateTool.create(spec, {
  name: 'Verify International Address',
  key: 'verify_international_address',
  description: `Verify and standardize an international postal address across 245+ countries. Returns a formatted, standardized address with verification status and match scores. Supports transliteration of foreign language addresses into Roman characters.`,
  instructions: [
    'Provide either a freeform address string OR structured address components.',
    'Include the country code for best results.',
    'Set geoData to true for latitude/longitude coordinates.',
    'Set includeDetails to true for additional parsed components.'
  ],
  constraints: [
    'Uses the international verification endpoint, separate from US/Canada verification.',
    'Geographic data uses the geoData parameter instead of geocode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      freeformAddress: z.string().optional().describe('Full address as a single string'),
      address: structuredAddressSchema.optional().describe('Structured address components'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Return additional parsed address components'),
      properCase: z.boolean().optional().describe('Return address in proper case'),
      geoData: z.boolean().optional().describe('Include latitude/longitude coordinates')
    })
  )
  .output(
    z.object({
      formattedAddress: z
        .string()
        .optional()
        .describe('Full formatted address as a single string'),
      line1: z.string().optional().describe('Address line 1'),
      line2: z.string().optional().describe('Address line 2'),
      line3: z.string().optional().describe('Address line 3'),
      line4: z.string().optional().describe('Address line 4'),
      city: z.string().optional().describe('City'),
      provinceOrState: z.string().optional().describe('Province or state'),
      postalOrZip: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country code'),
      building: z.string().optional().describe('Building name or number'),
      department: z.string().optional().describe('Department'),
      company: z.string().optional().describe('Company name'),
      summary: summarySchema,
      geoData: geoDataSchema,
      errors: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Errors or corrections applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let addressInput:
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
      addressInput = ctx.input.freeformAddress;
    } else if (ctx.input.address) {
      addressInput = ctx.input.address;
    } else {
      throw new Error('Either freeformAddress or address must be provided');
    }

    let result = await client.verifyInternationalAddress(addressInput, {
      includeDetails: ctx.input.includeDetails,
      geoData: ctx.input.geoData,
      properCase: ctx.input.properCase
    });

    let statusDescription = '';
    if (result.summary?.status) {
      let statusMap: Record<string, string> = {
        V: 'Verified',
        P: 'Partially Verified',
        U: 'Unverified',
        A: 'Ambiguous',
        C: 'Conflict',
        R: 'Reverted'
      };
      statusDescription = statusMap[result.summary.status] || result.summary.status;
    }

    let displayAddress =
      result.formattedAddress ||
      [result.line1, result.city, result.provinceOrState, result.postalOrZip, result.country]
        .filter(Boolean)
        .join(', ');

    return {
      output: result,
      message: `International address verification: **${statusDescription}**. Result: ${displayAddress}.`
    };
  })
  .build();
