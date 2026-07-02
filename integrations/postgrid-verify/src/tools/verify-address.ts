import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let structuredAddressSchema = z
  .object({
    line1: z.string().describe('Primary street address line'),
    line2: z.string().optional().describe('Secondary address line (apt, suite, unit, etc.)'),
    city: z.string().optional().describe('City name'),
    provinceOrState: z
      .string()
      .optional()
      .describe('Province or state code (e.g. "ON", "NY")'),
    postalOrZip: z.string().optional().describe('Postal or ZIP code'),
    country: z.string().optional().describe('Country code (e.g. "us", "ca")')
  })
  .describe('Structured address components');

let errorsSchema = z
  .record(z.string(), z.array(z.string()))
  .optional()
  .describe('Errors or corrections applied, keyed by field name');

let geocodeResultSchema = z
  .object({
    location: z
      .object({
        lat: z.number().describe('Latitude'),
        lng: z.number().describe('Longitude')
      })
      .describe('Geographic coordinates'),
    accuracy: z.number().describe('Accuracy score from 0.00 to 1.00'),
    accuracyType: z
      .string()
      .describe('Type of geocode match (rooftop, point, range_interpolation, etc.)')
  })
  .optional()
  .describe('Geocoding result (only if geocode option enabled)');

let detailsSchema = z
  .object({
    streetNumber: z.string().optional().describe('Parsed street number'),
    streetName: z.string().optional().describe('Parsed street name'),
    streetType: z.string().optional().describe('Street type (St, Ave, Blvd, etc.)'),
    streetDirection: z.string().optional().describe('Street direction (N, S, E, W)'),
    suiteKey: z.string().optional().describe('Suite designator (Apt, Suite, Unit, etc.)'),
    suiteID: z.string().optional().describe('Suite number'),
    county: z.string().optional().describe('County name (US only)'),
    residential: z.boolean().optional().describe('Whether the address is residential'),
    vacant: z.boolean().optional().describe('Whether the address is vacant')
  })
  .optional()
  .describe('Parsed address components (only if includeDetails option enabled)');

export let verifyAddress = SlateTool.create(spec, {
  name: 'Verify Address',
  key: 'verify_address',
  description: `Verify and standardize a US or Canadian postal address. Checks deliverability and returns a corrected, standardized address. Supports both structured address input and freeform address strings. Optionally returns parsed components (street name, type, county, residential/vacant indicators) and geocoding coordinates.`,
  instructions: [
    'Provide either a freeform address string OR structured address components, not both.',
    'Set includeDetails to true to get parsed street components, county, and residential/vacant indicators.',
    'Set geocode to true to receive latitude/longitude coordinates (must be enabled on your PostGrid account).',
    'When using geocode, always provide the country field for accurate results.'
  ],
  constraints: [
    'Rate limited to 5 requests per second by default.',
    'Geocoding requires activation by PostGrid support and counts as an additional lookup.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      freeformAddress: z
        .string()
        .optional()
        .describe(
          'Full address as a single string (e.g. "145 Mulberry St, New York, NY 10013")'
        ),
      address: structuredAddressSchema.optional().describe('Structured address components'),
      includeDetails: z
        .boolean()
        .optional()
        .describe('Return additional parsed address components'),
      properCase: z
        .boolean()
        .optional()
        .describe('Return address in proper case instead of uppercase'),
      geocode: z.boolean().optional().describe('Include latitude/longitude coordinates')
    })
  )
  .output(
    z.object({
      line1: z.string().describe('Primary address line'),
      line2: z.string().optional().describe('Secondary address line'),
      city: z.string().describe('City'),
      provinceOrState: z.string().describe('Province or state'),
      postalOrZip: z.string().describe('Postal or ZIP code'),
      zipPlus4: z.string().optional().describe('ZIP+4 code (US only)'),
      firmName: z.string().optional().describe('Business/firm name at the address'),
      country: z.string().describe('Country code'),
      countryName: z.string().optional().describe('Full country name'),
      status: z
        .enum(['verified', 'corrected', 'failed'])
        .describe(
          'Verification status: verified (deliverable), corrected (fixed), or failed (undeliverable)'
        ),
      errors: errorsSchema,
      geocodeResult: geocodeResultSchema,
      details: detailsSchema
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

    let result = await client.verifyAddress(addressInput, {
      includeDetails: ctx.input.includeDetails,
      properCase: ctx.input.properCase,
      geocode: ctx.input.geocode
    });

    let statusLabel =
      result.status === 'verified'
        ? 'deliverable as-is'
        : result.status === 'corrected'
          ? 'corrected and standardized'
          : 'could not be verified';

    let errorSummary = '';
    if (result.errors && Object.keys(result.errors).length > 0) {
      let errorParts = Object.entries(result.errors)
        .filter(([, msgs]) => msgs && msgs.length > 0)
        .map(([field, msgs]) => `${field}: ${msgs!.join(', ')}`);
      if (errorParts.length > 0) {
        errorSummary = ` Issues: ${errorParts.join('; ')}.`;
      }
    }

    return {
      output: result,
      message: `Address **${statusLabel}** (status: \`${result.status}\`). Result: ${result.line1}, ${result.city}, ${result.provinceOrState} ${result.postalOrZip}, ${result.country.toUpperCase()}.${errorSummary}`
    };
  })
  .build();
