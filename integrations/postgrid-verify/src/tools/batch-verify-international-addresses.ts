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
  country: z.string().optional().describe('Country code (ISO 2-letter)')
});

let addressInputSchema = z.union([
  z.string().describe('Freeform address string'),
  structuredAddressSchema
]);

let intlResultSchema = z.object({
  formattedAddress: z.string().optional().describe('Full formatted address'),
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
  summary: z
    .object({
      status: z.string().describe('Verification status code'),
      inputMatchLevel: z.string().optional(),
      verifiedMatchLevel: z.string().optional(),
      parsingStatus: z.string().optional()
    })
    .optional()
    .describe('Verification summary'),
  geoData: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.string().optional()
    })
    .optional()
    .describe('Geographic coordinates'),
  errors: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe('Errors or corrections')
});

export let batchVerifyInternationalAddresses = SlateTool.create(spec, {
  name: 'Batch Verify International Addresses',
  key: 'batch_verify_international_addresses',
  description: `Verify and standardize multiple international addresses in a single request across 245+ countries. Accepts a mix of freeform strings and structured addresses. Results are returned in the same order as input.`,
  constraints: [
    'Maximum of 2,000 addresses per batch.',
    'Requires a secret (server) API key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addresses: z
        .array(addressInputSchema)
        .min(1)
        .max(2000)
        .describe('Array of international addresses to verify (up to 2,000)'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Return additional parsed address components'),
      properCase: z.boolean().optional().describe('Return addresses in proper case'),
      geoData: z.boolean().optional().describe('Include latitude/longitude coordinates')
    })
  )
  .output(
    z.object({
      results: z
        .array(intlResultSchema)
        .describe('Verification results in the same order as input'),
      totalCount: z.number().describe('Total number of addresses processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.batchVerifyInternationalAddresses(ctx.input.addresses, {
      includeDetails: ctx.input.includeDetails,
      geoData: ctx.input.geoData,
      properCase: ctx.input.properCase
    });

    return {
      output: {
        results,
        totalCount: results.length
      },
      message: `Batch verified **${results.length}** international addresses.`
    };
  })
  .build();
