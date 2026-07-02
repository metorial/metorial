import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

export let validateAddressTool = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate and standardize a mailing address. Checks address components for correctness, identifies issues like misspellings or missing data, and returns the standardized address along with geocoded coordinates and metadata (e.g. residential vs. business).`,
  instructions: [
    'Provide the address as one or more address lines. Optionally specify a region code and locality for better results.',
    'Enable USPS CASS processing for US/Puerto Rico addresses to get enhanced postal data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressLines: z
        .array(z.string())
        .describe('Address lines (e.g. ["1600 Amphitheatre Parkway"])'),
      regionCode: z
        .string()
        .optional()
        .describe('Two-letter country/region code (e.g. "US", "GB")'),
      locality: z.string().optional().describe('City or town name'),
      enableUspsCass: z
        .boolean()
        .optional()
        .describe('Enable USPS CASS processing (US/PR addresses only)')
    })
  )
  .output(
    z.object({
      formattedAddress: z.string().optional().describe('Standardized formatted address'),
      addressComplete: z.boolean().optional().describe('Whether the address is complete'),
      hasInferredComponents: z
        .boolean()
        .optional()
        .describe('Whether any components were inferred'),
      hasReplacedComponents: z
        .boolean()
        .optional()
        .describe('Whether any components were corrected/replaced'),
      inputGranularity: z.string().optional().describe('Granularity of the input address'),
      validationGranularity: z
        .string()
        .optional()
        .describe('Granularity the address was validated to'),
      latitude: z.number().optional().describe('Geocoded latitude'),
      longitude: z.number().optional().describe('Geocoded longitude'),
      isResidential: z.boolean().optional().describe('Whether the address is residential'),
      isBusiness: z.boolean().optional().describe('Whether the address is a business'),
      isPoBox: z.boolean().optional().describe('Whether the address is a PO Box')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let response = await client.validateAddress({
      addressLines: ctx.input.addressLines,
      regionCode: ctx.input.regionCode,
      locality: ctx.input.locality,
      enableUspsCass: ctx.input.enableUspsCass
    });

    let result = response.result || {};
    let verdict = result.verdict || {};
    let address = result.address || {};
    let geocode = result.geocode || {};
    let metadata = result.metadata || {};
    let location = geocode.location || {};

    let output = {
      formattedAddress: address.formattedAddress,
      addressComplete: verdict.addressComplete,
      hasInferredComponents: verdict.hasInferredComponents,
      hasReplacedComponents: verdict.hasReplacedComponents,
      inputGranularity: verdict.inputGranularity,
      validationGranularity: verdict.validationGranularity,
      latitude: location.latitude,
      longitude: location.longitude,
      isResidential: metadata.residential,
      isBusiness: metadata.business,
      isPoBox: metadata.poBox
    };

    let status = verdict.addressComplete ? '✅ Valid' : '⚠️ Incomplete';
    let message = `${status} address. Formatted: **${address.formattedAddress || 'N/A'}**`;

    return { output, message };
  })
  .build();
