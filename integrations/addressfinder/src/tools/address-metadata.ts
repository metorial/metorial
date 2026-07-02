import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addressMetadataTool = SlateTool.create(spec, {
  name: 'Address Metadata',
  key: 'address_metadata',
  description: `Retrieve full metadata for an address selected from autocomplete results. Returns structured address components, geocoordinates, census data, and postal identifiers. Works with AU, NZ, and international addresses.`,
  instructions: [
    'Use the address identifier returned by the Address Autocomplete tool.',
    'For AU addresses, provide addressId, gnafId, or dpid.',
    'For NZ addresses, provide pxid or dpid.',
    'For international addresses, provide addressId and the country code.',
    'Set includeGps to true to include latitude/longitude coordinates.'
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
        .describe('Country of the address. Omit for international.'),
      internationalCountryCode: z
        .string()
        .optional()
        .describe(
          'ISO 3166 alpha-2 country code for international addresses (e.g., "gb", "us").'
        ),
      addressId: z
        .string()
        .optional()
        .describe(
          'Address identifier from autocomplete results (AU/INT: "id" field, NZ: use pxid instead)'
        ),
      pxid: z
        .string()
        .optional()
        .describe('NZ unique address identifier from autocomplete results'),
      gnafId: z.string().optional().describe('AU G-NAF unique identifier'),
      dpid: z.string().optional().describe('AU/NZ delivery point identifier'),
      source: z
        .string()
        .optional()
        .describe('AU only: data source - "GNAF", "PAF", or "GNAF,PAF"'),
      includeGps: z
        .boolean()
        .optional()
        .describe('Include latitude/longitude coordinates in the response'),
      census: z
        .number()
        .optional()
        .describe('Census data year (AU: 2016 or 2021; NZ: 2018 or 2023)')
    })
  )
  .output(
    z.object({
      address: z
        .record(z.string(), z.any())
        .describe(
          'Full address metadata including structured components, identifiers, and coordinates'
        ),
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
      data = await client.intAddressMetadata({
        country: ctx.input.internationalCountryCode!,
        addressId: ctx.input.addressId!,
        gps: ctx.input.includeGps ? '1' : undefined
      });
    } else if (country === 'au') {
      data = await client.auAddressMetadata({
        addressId: ctx.input.addressId,
        gnafId: ctx.input.gnafId,
        dpid: ctx.input.dpid,
        source: ctx.input.source,
        gps: ctx.input.includeGps ? '1' : undefined,
        census: ctx.input.census
      });
    } else {
      data = await client.nzAddressMetadata({
        pxid: ctx.input.pxid,
        dpid: ctx.input.dpid,
        census: ctx.input.census
      });
    }

    // The metadata response may be in a `completions` array or directly in the response
    let address = data;
    if (data.completions && Array.isArray(data.completions) && data.completions.length > 0) {
      address = data.completions[0];
    }

    let displayAddress =
      address.full_address || address.a || address.canonical_address || 'Address retrieved';

    return {
      output: {
        address,
        success: data.success ?? true
      },
      message: `Retrieved metadata for: **${displayAddress}**`
    };
  })
  .build();
