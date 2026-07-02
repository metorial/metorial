import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

let verifiedAddressSchema = z.object({
  addressLineOne: z.string().optional().describe('Standardized first address line'),
  addressLineTwo: z.string().optional().describe('Standardized second address line'),
  city: z.string().optional().describe('City name'),
  state: z.string().optional().describe('State (2-letter abbreviation)'),
  zipCode: z.string().optional().describe('ZIP code'),
  countryIso2: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
  confidence: z.string().optional().describe('Match confidence level'),
  matchInformation: z.string().optional().describe('Description of the match result'),
  fit: z.number().optional().describe('Match fit score'),
  latitude: z.number().optional().describe('Latitude coordinate'),
  longitude: z.number().optional().describe('Longitude coordinate'),
  carrierRoute: z.string().optional().describe('USPS carrier route'),
  congressionalDistrict: z.string().optional().describe('Congressional district'),
  countyName: z.string().optional().describe('County name'),
  timeZone: z.string().optional().describe('Time zone'),
  dpvConfirmation: z
    .string()
    .optional()
    .describe('Delivery Point Validation confirmation indicator'),
  isCommercial: z.boolean().optional().describe('Whether the address is a commercial address'),
  count: z.number().optional().describe('Number of matching addresses found')
});

export let verifyAddress = SlateTool.create(spec, {
  name: 'Verify Address',
  key: 'verify_address',
  description: `Verify and standardize a US address against USPS CASS-certified postal data. Takes a complete or partial address and returns a standardized, deliverable address with validation indicators.
Useful for cleaning address databases, validating form submissions, verifying shipping addresses before fulfillment, and CRM data quality.
Supports flexible input: a full address string, or an address with separate city, state, and ZIP code components.`,
  constraints: [
    'Currently focused on US address verification only.',
    'Each verification consumes a lookup from your balance.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Full or partial address string (e.g., "123 Main St, Springfield, CO 81073")'
        ),
      zipCode: z
        .string()
        .optional()
        .describe(
          'ZIP code, if provided separately from the query (e.g., "81073-1119", "810731119", or "81073")'
        ),
      city: z.string().optional().describe('City name, if provided separately from the query'),
      state: z
        .string()
        .optional()
        .describe(
          'State, if provided separately from the query (2-letter abbreviation preferred)'
        ),
      tags: z
        .string()
        .optional()
        .describe('Metadata tag to annotate this lookup for tracking purposes')
    })
  )
  .output(verifiedAddressSchema)
  .handleInvocation(async ctx => {
    let client = new AddressZenClient({ token: ctx.auth.token });

    let result = await client.verifyAddress({
      query: ctx.input.query,
      zipCode: ctx.input.zipCode,
      city: ctx.input.city,
      state: ctx.input.state,
      tags: ctx.input.tags
    });

    let r = result.result || {};
    let match = r.match || {};

    let output = {
      addressLineOne: r.address_line_one || undefined,
      addressLineTwo: r.address_line_two || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      zipCode: r.zip_code || undefined,
      countryIso2: r.country_iso_2 || undefined,
      confidence: r.confidence || undefined,
      matchInformation: r.match_information || undefined,
      fit: r.fit !== undefined ? Number(r.fit) : undefined,
      latitude: match.latitude !== undefined ? Number(match.latitude) : undefined,
      longitude: match.longitude !== undefined ? Number(match.longitude) : undefined,
      carrierRoute: match.carrier_route || undefined,
      congressionalDistrict: match.congressional_district || undefined,
      countyName: match.county || undefined,
      timeZone: match.time_zone || undefined,
      dpvConfirmation: match.dpv_confirmation || undefined,
      isCommercial: match.commercial !== undefined ? Boolean(match.commercial) : undefined,
      count: r.count !== undefined ? Number(r.count) : undefined
    };

    let addressLine = [output.addressLineOne, output.city, output.state, output.zipCode]
      .filter(Boolean)
      .join(', ');
    let confidenceMsg = output.confidence ? ` (confidence: ${output.confidence})` : '';

    return {
      output,
      message: `Verified address: **${addressLine || ctx.input.query}**${confidenceMsg}`
    };
  })
  .build();
