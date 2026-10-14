import { SlateTool } from 'slates';
import { z } from 'zod';
import { parseAddressNumber } from '../lib/address-fields';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  line1: z.string().optional().describe('First line of the address'),
  line2: z.string().optional().describe('Second line of the address'),
  line3: z.string().optional().describe('Third line of the address'),
  city: z.string().optional().describe('City or post town'),
  county: z.string().optional().describe('County'),
  state: z.string().optional().describe('State (US addresses, 2-letter abbreviation)'),
  postcode: z.string().optional().describe('Postcode or ZIP code'),
  zipCode: z.string().optional().describe('ZIP+4 code (US addresses)'),
  country: z.string().optional().describe('Country name'),
  countryIso: z.string().optional().describe('ISO country code (e.g., "GBR", "USA")'),
  latitude: z.number().optional().describe('Latitude coordinate'),
  longitude: z.number().optional().describe('Longitude coordinate'),
  udprn: z.number().optional().describe('Unique Delivery Point Reference Number'),
  umprn: z.number().optional().describe('Unique Multiple Residence Reference Number'),
  uprn: z.string().optional().describe('Unique Property Reference Number'),
  buildingName: z.string().optional().describe('Building name'),
  buildingNumber: z.string().optional().describe('Building number'),
  subBuildingName: z.string().optional().describe('Sub-building name (e.g., flat, apartment)'),
  thoroughfare: z.string().optional().describe('Thoroughfare (street name)'),
  dependentLocality: z.string().optional().describe('Dependent locality'),
  district: z.string().optional().describe('District'),
  ward: z.string().optional().describe('Ward'),
  organisationName: z.string().optional().describe('Organisation name if a commercial address')
});

export let resolveAddress = SlateTool.create(spec, {
  name: 'Resolve Address',
  key: 'resolve_address',
  description: `Resolve a full address from an autocomplete suggestion ID. This is step 2 of the address autocomplete process: first use **Search Addresses** to get suggestions, then use this tool with the suggestion's address ID to retrieve complete address details.
Returns standardized address components including street lines, city, state/county, postcode, and geographic coordinates.`,
  instructions: [
    'Use "usa" format for all licensed countries. The "gbr" option is retained for existing UK-format workflows.',
    'This operation consumes a lookup from your balance.'
  ],
  constraints: ['Each resolution decrements your lookup balance.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('Address ID from an autocomplete suggestion'),
      format: z
        .enum(['usa', 'gbr'])
        .default('usa')
        .describe(
          'Address format: "usa" returns US-style fields for all licensed countries; "gbr" is the legacy UK-shaped format (3 address lines, post town, postcode)'
        )
    })
  )
  .output(addressSchema)
  .handleInvocation(async ctx => {
    let client = new AddressZenClient(ctx.auth);

    let result = await client.resolveAddress(ctx.input.addressId, ctx.input.format);
    let addr = result.result || {};

    let output = {
      line1: addr.line_1 || undefined,
      line2: addr.line_2 || undefined,
      line3: addr.line_3 || undefined,
      city: addr.city || addr.post_town || undefined,
      county: addr.county || undefined,
      state: addr.state_abbreviation || addr.state || undefined,
      postcode: addr.postcode || addr.zip_code || undefined,
      zipCode: addr.zip_plus_4_code || addr.zip_code || undefined,
      country: addr.country || undefined,
      countryIso: addr.country_iso || undefined,
      latitude: parseAddressNumber(addr.latitude),
      longitude: parseAddressNumber(addr.longitude),
      udprn: parseAddressNumber(addr.udprn),
      umprn: parseAddressNumber(addr.umprn),
      uprn: addr.uprn?.toString(),
      buildingName: addr.building_name || undefined,
      buildingNumber: addr.building_number || undefined,
      subBuildingName: addr.sub_building_name || undefined,
      thoroughfare: addr.thoroughfare || undefined,
      dependentLocality: addr.dependent_locality || addr.dependant_locality || undefined,
      district: addr.district || undefined,
      ward: addr.ward || undefined,
      organisationName: addr.organisation_name || undefined
    };

    let addressLine = [output.line1, output.line2, output.city, output.state, output.postcode]
      .filter(Boolean)
      .join(', ');

    return {
      output,
      message: `Resolved address: **${addressLine || ctx.input.addressId}**`
    };
  })
  .build();
