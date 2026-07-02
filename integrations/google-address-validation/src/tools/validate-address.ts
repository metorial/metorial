import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAddressValidationActionScopes } from '../scopes';
import { spec } from '../spec';

let addressComponentSchema = z.object({
  componentName: z
    .object({
      text: z.string().describe('The name text for this component'),
      languageCode: z.string().optional().describe('BCP-47 language code')
    })
    .describe('The name of this component'),
  componentType: z
    .string()
    .describe(
      'The type of the address component (e.g. street_number, route, locality, administrative_area_level_1, country, postal_code)'
    ),
  confirmationLevel: z
    .string()
    .describe(
      'Confirmation level: CONFIRMED, UNCONFIRMED_BUT_PLAUSIBLE, or UNCONFIRMED_AND_SUSPICIOUS'
    ),
  inferred: z
    .boolean()
    .optional()
    .describe('Whether this component was not part of the input but was inferred'),
  spellCorrected: z
    .boolean()
    .optional()
    .describe('Whether the component value was spell-corrected'),
  replaced: z
    .boolean()
    .optional()
    .describe('Whether the component value was replaced entirely'),
  unexpected: z
    .boolean()
    .optional()
    .describe('Whether this component was not expected for the address')
});

let verdictSchema = z.object({
  inputGranularity: z
    .string()
    .optional()
    .describe('Granularity of the input address (e.g. SUB_PREMISE, PREMISE, ROUTE, OTHER)'),
  validationGranularity: z
    .string()
    .optional()
    .describe('Granularity level the API was able to validate to'),
  geocodeGranularity: z
    .string()
    .optional()
    .describe('Granularity of the geocode generated for this address'),
  addressComplete: z
    .boolean()
    .optional()
    .describe('Whether the address is considered complete'),
  hasUnconfirmedComponents: z
    .boolean()
    .optional()
    .describe('Whether any component could not be confirmed'),
  hasInferredComponents: z
    .boolean()
    .optional()
    .describe('Whether any component was inferred that was not in the input'),
  hasReplacedComponents: z.boolean().optional().describe('Whether any component was replaced'),
  hasSpellCorrectedComponents: z
    .boolean()
    .optional()
    .describe('Whether any component was spell-corrected'),
  possibleNextAction: z
    .string()
    .optional()
    .describe('Suggested next action: FIX, CONFIRM_ADD_SUBPREMISES, CONFIRM, or ACCEPT')
});

let geocodeSchema = z.object({
  location: z
    .object({
      latitude: z.number().describe('Latitude of the address'),
      longitude: z.number().describe('Longitude of the address')
    })
    .describe('Geocoded location coordinates'),
  plusCode: z
    .object({
      globalCode: z.string().describe('Global plus code'),
      compoundCode: z.string().optional().describe('Compound plus code')
    })
    .optional()
    .describe('Plus Code for the location'),
  bounds: z
    .object({
      low: z.object({ latitude: z.number(), longitude: z.number() }),
      high: z.object({ latitude: z.number(), longitude: z.number() })
    })
    .optional()
    .describe('Bounding box of the geocoded location'),
  featureSizeMeters: z.number().optional().describe('Size of the geocoded area in meters'),
  placeId: z.string().optional().describe('Google Place ID for the address'),
  placeTypes: z.array(z.string()).optional().describe('Place types for the place ID')
});

let metadataSchema = z.object({
  business: z.boolean().optional().describe('Whether the address is a known business address'),
  poBox: z.boolean().optional().describe('Whether the address is a PO Box'),
  residential: z.boolean().optional().describe('Whether the address is a residential address')
});

let uspsDataSchema = z
  .object({
    standardizedAddress: z
      .object({
        firstAddressLine: z.string().optional(),
        firm: z.string().optional(),
        secondAddressLine: z.string().optional(),
        urbanization: z.string().optional(),
        cityStateZipAddressLine: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        zipCodeExtension: z.string().optional()
      })
      .optional()
      .describe('USPS standardized address'),
    deliveryPointCode: z.string().optional().describe('2-digit delivery point code'),
    deliveryPointCheckDigit: z.string().optional().describe('Delivery point check digit'),
    dpvConfirmation: z.string().optional().describe('DPV confirmation indicator'),
    dpvFootnote: z.string().optional().describe('DPV footnotes'),
    dpvCmra: z
      .string()
      .optional()
      .describe('Whether the address is a CMRA (Commercial Mail Receiving Agency)'),
    dpvVacant: z.string().optional().describe('Whether the address is vacant'),
    dpvNoStat: z.string().optional().describe('No-stat indicator'),
    carrierRoute: z.string().optional().describe('Carrier route code'),
    carrierRouteIndicator: z.string().optional().describe('Carrier route rate sort indicator'),
    postOfficeCity: z.string().optional().describe('Post office city'),
    postOfficeState: z.string().optional().describe('Post office state'),
    fipsCountyCode: z.string().optional().describe('FIPS county code'),
    county: z.string().optional().describe('County name'),
    elotNumber: z.string().optional().describe('Enhanced Line of Travel number'),
    elotFlag: z.string().optional().describe('eLOT ascending/descending flag'),
    addressRecordType: z.string().optional().describe('Address record type'),
    defaultAddress: z.boolean().optional().describe('Whether this is a default address'),
    cassProcessed: z.boolean().optional().describe('Whether CASS processing was performed')
  })
  .optional();

let postalAddressSchema = z.object({
  regionCode: z.string().optional().describe('CLDR region code of the country/region'),
  languageCode: z.string().optional().describe('BCP-47 language code'),
  postalCode: z.string().optional().describe('Postal code'),
  sortingCode: z.string().optional().describe('Sorting code'),
  administrativeArea: z.string().optional().describe('Administrative area (state/province)'),
  locality: z.string().optional().describe('Locality (city/town)'),
  sublocality: z.string().optional().describe('Sublocality'),
  addressLines: z.array(z.string()).optional().describe('Address lines'),
  recipients: z.array(z.string()).optional().describe('Recipients'),
  organization: z.string().optional().describe('Organization name')
});

let validatedAddressSchema = z.object({
  formattedAddress: z
    .string()
    .optional()
    .describe('The validated and formatted address string'),
  postalAddress: postalAddressSchema.optional().describe('The structured postal address'),
  addressComponents: z
    .array(addressComponentSchema)
    .optional()
    .describe('Individual address components with validation details'),
  missingComponentTypes: z
    .array(z.string())
    .optional()
    .describe('Component types that were expected but missing from the address'),
  unconfirmedComponentTypes: z
    .array(z.string())
    .optional()
    .describe('Component types that could not be confirmed'),
  unresolvedTokens: z
    .array(z.string())
    .optional()
    .describe('Tokens in the input that could not be resolved')
});

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validates, standardizes, and geocodes a postal address. Accepts either structured address fields or unstructured address lines and returns a validated, formatted address along with component-level validation details, geocode coordinates, and a Google Place ID.

For US/Puerto Rico addresses, optionally enables **USPS CASS processing** to obtain ZIP+4 codes, delivery point codes, and carrier route information.

When re-validating a previously validated address, provide the \`previousResponseId\` to improve accuracy.`,
  instructions: [
    'Provide at minimum the address lines. Including regionCode significantly improves accuracy.',
    'For US addresses requiring USPS-specific data, set enableUspsCass to true.',
    'Use previousResponseId when validating a corrected version of a previously validated address.'
  ],
  constraints: [
    'Address metadata (residential, business, PO Box) is only available for select countries.',
    'USPS CASS processing is only available for US and Puerto Rico addresses.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleAddressValidationActionScopes.validateAddress)
  .input(
    z.object({
      addressLines: z
        .array(z.string())
        .describe(
          'Address lines (e.g. street address, apt number). Use this for unstructured or partially structured addresses.'
        ),
      regionCode: z
        .string()
        .optional()
        .describe(
          'CLDR region code of the address country (e.g. "US", "FR", "JP"). Highly recommended for accuracy.'
        ),
      locality: z.string().optional().describe('City or town name'),
      administrativeArea: z
        .string()
        .optional()
        .describe('State, province, or administrative area'),
      postalCode: z.string().optional().describe('Postal or ZIP code'),
      languageCode: z
        .string()
        .optional()
        .describe('BCP-47 language code for the input address (e.g. "en", "fr")'),
      organization: z
        .string()
        .optional()
        .describe('Organization or business name at the address'),
      recipients: z.array(z.string()).optional().describe('Recipients at the address'),
      enableUspsCass: z
        .boolean()
        .optional()
        .describe(
          'Enable USPS CASS processing for US/Puerto Rico addresses to get ZIP+4, delivery point codes, and carrier route info'
        ),
      returnEnglishLatinAddress: z
        .boolean()
        .optional()
        .describe('Return the address in English Latin script (preview feature)'),
      previousResponseId: z
        .string()
        .optional()
        .describe(
          'Response ID from a prior validation of this address, used when re-validating a corrected address'
        ),
      sessionToken: z
        .string()
        .optional()
        .describe('Session token for billing grouping of validation requests')
    })
  )
  .output(
    z.object({
      responseId: z
        .string()
        .describe(
          'Unique response ID. Use this for provideValidationFeedback or as previousResponseId in subsequent validations.'
        ),
      verdict: verdictSchema.describe(
        'Overall assessment of the address quality and completeness'
      ),
      validatedAddress: validatedAddressSchema.describe(
        'The validated and standardized address with component-level details'
      ),
      geocode: geocodeSchema
        .optional()
        .describe('Geocode coordinates and place information for the address'),
      addressMetadata: metadataSchema
        .optional()
        .describe('Metadata about the address type (residential, business, PO Box)'),
      uspsData: uspsDataSchema.describe(
        'USPS-specific data (only populated when enableUspsCass is true for US/PR addresses)'
      ),
      englishLatinAddress: validatedAddressSchema
        .optional()
        .describe(
          'Address formatted in English Latin script (only when returnEnglishLatinAddress is true)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.validateAddress({
      address: {
        regionCode: ctx.input.regionCode,
        languageCode: ctx.input.languageCode,
        postalCode: ctx.input.postalCode,
        administrativeArea: ctx.input.administrativeArea,
        locality: ctx.input.locality,
        addressLines: ctx.input.addressLines,
        recipients: ctx.input.recipients,
        organization: ctx.input.organization
      },
      previousResponseId: ctx.input.previousResponseId,
      enableUspsCass: ctx.input.enableUspsCass,
      languageOptions: ctx.input.returnEnglishLatinAddress
        ? { returnEnglishLatinAddress: ctx.input.returnEnglishLatinAddress }
        : undefined,
      sessionToken: ctx.input.sessionToken
    });

    let result = response.result;
    let verdict = result.verdict;

    let formattedAddress = result.address?.formattedAddress ?? 'N/A';
    let isComplete = verdict.addressComplete ? 'Yes' : 'No';
    let granularity = verdict.validationGranularity ?? 'Unknown';
    let nextAction = verdict.possibleNextAction;

    let messageParts = [
      `**Validated address:** ${formattedAddress}`,
      `**Complete:** ${isComplete} | **Granularity:** ${granularity}`
    ];

    if (nextAction) {
      messageParts.push(`**Suggested next action:** ${nextAction}`);
    }

    if (result.geocode?.placeId) {
      messageParts.push(`**Place ID:** ${result.geocode.placeId}`);
    }

    if (result.geocode?.location) {
      messageParts.push(
        `**Coordinates:** ${result.geocode.location.latitude}, ${result.geocode.location.longitude}`
      );
    }

    if (result.metadata) {
      let types: string[] = [];
      if (result.metadata.residential) types.push('Residential');
      if (result.metadata.business) types.push('Business');
      if (result.metadata.poBox) types.push('PO Box');
      if (types.length > 0) {
        messageParts.push(`**Address type:** ${types.join(', ')}`);
      }
    }

    return {
      output: {
        responseId: response.responseId,
        verdict: result.verdict,
        validatedAddress: result.address,
        geocode: result.geocode,
        addressMetadata: result.metadata,
        uspsData: result.uspsData,
        englishLatinAddress: result.englishLatinAddress
      },
      message: messageParts.join('\n')
    };
  })
  .build();
