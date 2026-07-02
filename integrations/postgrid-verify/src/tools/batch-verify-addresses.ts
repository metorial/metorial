import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let structuredAddressSchema = z.object({
  line1: z.string().describe('Primary street address line'),
  line2: z.string().optional().describe('Secondary address line'),
  city: z.string().optional().describe('City name'),
  provinceOrState: z.string().optional().describe('Province or state code'),
  postalOrZip: z.string().optional().describe('Postal or ZIP code'),
  country: z.string().optional().describe('Country code')
});

let addressInputSchema = z
  .union([z.string().describe('Freeform address string'), structuredAddressSchema])
  .describe('Address as either a freeform string or structured components');

let verificationResultSchema = z.object({
  line1: z.string().describe('Primary address line'),
  line2: z.string().optional().describe('Secondary address line'),
  city: z.string().describe('City'),
  provinceOrState: z.string().describe('Province or state'),
  postalOrZip: z.string().describe('Postal or ZIP code'),
  zipPlus4: z.string().optional().describe('ZIP+4 code (US only)'),
  firmName: z.string().optional().describe('Business/firm name'),
  country: z.string().describe('Country code'),
  countryName: z.string().optional().describe('Full country name'),
  status: z.enum(['verified', 'corrected', 'failed']).describe('Verification status'),
  errors: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe('Errors or corrections by field'),
  details: z.record(z.string(), z.unknown()).optional().describe('Parsed address components'),
  geocodeResult: z
    .object({
      location: z.object({
        lat: z.number(),
        lng: z.number()
      }),
      accuracy: z.number(),
      accuracyType: z.string()
    })
    .optional()
    .describe('Geocoding result')
});

export let batchVerifyAddresses = SlateTool.create(spec, {
  name: 'Batch Verify Addresses',
  key: 'batch_verify_addresses',
  description: `Verify and standardize multiple US/Canadian addresses in a single request. Accepts a mix of freeform strings and structured addresses. Results are returned in the same order as the input. Each address is individually verified with its own status.`,
  instructions: [
    'Each element in the addresses array can be either a freeform string or a structured address object.',
    'Results preserve the order of the input addresses.'
  ],
  constraints: [
    'Maximum of 2,000 addresses per batch.',
    'Requires a secret (server) API key, not a public key.',
    'Rate limited to 5 requests per second by default.'
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
        .describe('Array of addresses to verify (up to 2,000)'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Return additional parsed address components for each address'),
      properCase: z
        .boolean()
        .optional()
        .describe('Return addresses in proper case instead of uppercase'),
      geocode: z
        .boolean()
        .optional()
        .describe('Include latitude/longitude coordinates for each address')
    })
  )
  .output(
    z.object({
      results: z
        .array(verificationResultSchema)
        .describe('Verification results in the same order as input'),
      totalCount: z.number().describe('Total number of addresses processed'),
      verifiedCount: z.number().describe('Number of addresses verified successfully'),
      correctedCount: z.number().describe('Number of addresses that were corrected'),
      failedCount: z.number().describe('Number of addresses that failed verification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.batchVerifyAddresses(ctx.input.addresses, {
      includeDetails: ctx.input.includeDetails,
      properCase: ctx.input.properCase,
      geocode: ctx.input.geocode
    });

    let verifiedCount = results.filter(r => r.status === 'verified').length;
    let correctedCount = results.filter(r => r.status === 'corrected').length;
    let failedCount = results.filter(r => r.status === 'failed').length;

    return {
      output: {
        results,
        totalCount: results.length,
        verifiedCount,
        correctedCount,
        failedCount
      },
      message: `Batch verified **${results.length}** addresses: **${verifiedCount}** verified, **${correctedCount}** corrected, **${failedCount}** failed.`
    };
  })
  .build();
