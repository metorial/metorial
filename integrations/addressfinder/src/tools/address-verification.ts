import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addressVerificationTool = SlateTool.create(spec, {
  name: 'Verify Address',
  key: 'verify_address',
  description: `Verify a full address against the Addressfinder database. Accepts an address that may contain errors or typos and returns the matched, standardized address along with metadata. Available for Australian and New Zealand addresses.`,
  instructions: [
    'Provide the full address string as the query.',
    'The API will attempt to match even addresses with typos or errors.',
    'Set includeGps to true for AU addresses to include coordinates.',
    'Set includeExtended to true for AU addresses to include LGA, G-NAF ID, and legal parcel data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      country: z
        .enum(['au', 'nz'])
        .optional()
        .describe('Country to verify against. Defaults to the configured default country.'),
      query: z.string().describe('The full address to verify (can contain errors or typos)'),
      stateCodes: z
        .string()
        .optional()
        .describe('AU only: filter by state codes, comma-separated (e.g., "NSW,VIC")'),
      regionCode: z
        .string()
        .optional()
        .describe('NZ only: restrict to a specific region code (1-9, A-H)'),
      postBox: z
        .string()
        .optional()
        .describe('Control PO Box matching: "0" (exclude), "1" (only PO Boxes)'),
      includeGps: z
        .boolean()
        .optional()
        .describe('AU only: include latitude/longitude in the response'),
      includeExtended: z
        .boolean()
        .optional()
        .describe('AU only: include LGA, G-NAF ID, and legal parcel data'),
      census: z
        .number()
        .optional()
        .describe('Census year for statistical data (AU: 2016 or 2021; NZ: 2018 or 2023)'),
      gnaf: z
        .string()
        .optional()
        .describe(
          'AU only: query GNAF database for physical addresses - "0" or "1" (default: "1")'
        ),
      paf: z
        .string()
        .optional()
        .describe(
          'AU only: query PAF database for postal addresses - "0" or "1" (default: "1")'
        )
    })
  )
  .output(
    z.object({
      matched: z.boolean().describe('Whether the address was successfully matched'),
      address: z
        .record(z.string(), z.any())
        .optional()
        .describe('The matched and standardized address with full metadata'),
      success: z.boolean().describe('Whether the API request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let country = ctx.input.country ?? ctx.config.defaultCountry;
    let data: any;

    if (country === 'au') {
      data = await client.auAddressVerification({
        query: ctx.input.query,
        gnaf: ctx.input.gnaf,
        paf: ctx.input.paf,
        postBox: ctx.input.postBox,
        gps: ctx.input.includeGps ? '1' : undefined,
        extended: ctx.input.includeExtended ? '1' : undefined,
        census: ctx.input.census,
        stateCodes: ctx.input.stateCodes
      });
    } else {
      data = await client.nzAddressVerification({
        query: ctx.input.query,
        postBox: ctx.input.postBox,
        regionCode: ctx.input.regionCode,
        census: ctx.input.census
      });
    }

    let matched = data.matched ?? false;
    let address = matched ? data.address || data : undefined;
    let displayAddress = address?.full_address || address?.a || ctx.input.query;

    return {
      output: {
        matched,
        address,
        success: data.success ?? true
      },
      message: matched
        ? `Address verified and matched: **${displayAddress}**`
        : `Address could not be matched: "${ctx.input.query}"`
    };
  })
  .build();
