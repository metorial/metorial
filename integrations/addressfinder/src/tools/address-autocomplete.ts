import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let completionSchema = z.object({
  fullAddress: z.string().optional().describe('Full matched address (AU/INT)'),
  addressId: z.string().optional().describe('Unique address identifier'),
  canonicalAddress: z.string().optional().describe('Canonical address string (NZ)'),
  pxid: z.string().optional().describe('Unique address identifier (NZ)'),
  addressVersion: z.number().optional().describe('Address version: 1=postal, 0=physical (NZ)')
});

export let addressAutocompleteTool = SlateTool.create(spec, {
  name: 'Address Autocomplete',
  key: 'address_autocomplete',
  description: `Search for addresses using type-ahead autocomplete. Supports Australian (AU), New Zealand (NZ), and international addresses. Returns a list of closely matching addresses as the user types. Use the returned address identifier with the **Address Metadata** tool to get full details.`,
  instructions: [
    'For AU addresses, use stateCodes to filter by state (e.g., "NSW,VIC").',
    'For NZ addresses, use regionCode to filter by region.',
    'For international addresses, provide a valid ISO 3166 alpha-2 country code.',
    'The returned address identifiers can be passed to the Address Metadata tool to retrieve full address details.'
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
        .describe(
          'Country to search in. Use "au" for Australia, "nz" for New Zealand. Omit for international search.'
        ),
      internationalCountryCode: z
        .string()
        .optional()
        .describe(
          'ISO 3166 alpha-2 country code for international search (e.g., "gb", "us", "de"). Only used when country is not set.'
        ),
      query: z.string().describe('Partial address to search for'),
      maxResults: z
        .number()
        .optional()
        .describe(
          'Maximum number of results to return (default 10, max 100 for AU/NZ, max 15 for international)'
        ),
      stateCodes: z
        .string()
        .optional()
        .describe('AU only: filter by state codes, comma-separated (e.g., "NSW,VIC,QLD")'),
      regionCode: z.string().optional().describe('NZ only: filter by region code (1-9, A-H)'),
      source: z
        .string()
        .optional()
        .describe(
          'AU only: address source - "GNAF" (physical), "PAF" (postal), or "GNAF,PAF" (default)'
        ),
      postBox: z
        .string()
        .optional()
        .describe('Control PO Box inclusion: "0" (exclude), "1" (only PO Boxes)'),
      delivered: z
        .string()
        .optional()
        .describe('NZ only: filter by NZ Post delivery status - "0" or "1"')
    })
  )
  .output(
    z.object({
      completions: z.array(completionSchema).describe('List of matching address suggestions'),
      success: z.boolean().describe('Whether the request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let country = ctx.input.country ?? ctx.config.defaultCountry;
    let isInternational = !ctx.input.country && ctx.input.internationalCountryCode;

    let data: any;

    if (isInternational) {
      data = await client.intAddressAutocomplete({
        country: ctx.input.internationalCountryCode!,
        query: ctx.input.query,
        max: ctx.input.maxResults
      });
    } else if (country === 'au') {
      data = await client.auAddressAutocomplete({
        query: ctx.input.query,
        max: ctx.input.maxResults,
        stateCodes: ctx.input.stateCodes,
        source: ctx.input.source,
        postBox: ctx.input.postBox
      });
    } else {
      data = await client.nzAddressAutocomplete({
        query: ctx.input.query,
        max: ctx.input.maxResults,
        regionCode: ctx.input.regionCode,
        delivered: ctx.input.delivered,
        postBox: ctx.input.postBox
      });
    }

    let completions = (data.completions || []).map((c: any) => ({
      fullAddress: c.full_address || c.a || undefined,
      addressId: c.id || undefined,
      canonicalAddress: c.a || undefined,
      pxid: c.pxid || undefined,
      addressVersion: c.v !== undefined ? c.v : undefined
    }));

    return {
      output: {
        completions,
        success: data.success ?? true
      },
      message: `Found **${completions.length}** address suggestions for "${ctx.input.query}".`
    };
  })
  .build();
