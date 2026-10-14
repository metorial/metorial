import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RadarClient } from '../lib/client';
import { spec } from '../spec';

export let validateAddressTool = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate and standardize a postal address. Returns the validated address with standardized formatting and verification status. Useful for ensuring address correctness before shipping, delivery, or record storage.`,
  constraints: [
    'Available for US and Canada addresses for enterprise customers. Default rate limit is 25 requests per second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      city: z.string().describe('City name'),
      stateCode: z.string().describe('State code (e.g., NY, CA)'),
      postalCode: z.string().describe('Postal/zip code'),
      countryCode: z.string().describe('2-letter country code (e.g., US)'),
      number: z.string().optional().describe('Street number'),
      street: z.string().optional().describe('Street name'),
      unit: z.string().optional().describe('Unit or apartment number'),
      addressLabel: z.string().optional().describe('Full address label')
    })
  )
  .output(
    z.object({
      address: z
        .object({
          latitude: z.number().optional().describe('Validated latitude'),
          longitude: z.number().optional().describe('Validated longitude'),
          formattedAddress: z.string().optional().describe('Standardized full address'),
          addressLabel: z.string().optional().describe('Standardized address label'),
          number: z.string().optional().describe('Standardized street number'),
          street: z.string().optional().describe('Standardized street name'),
          city: z.string().optional().describe('Standardized city'),
          stateCode: z.string().optional().describe('Standardized state code'),
          postalCode: z.string().optional().describe('Standardized postal code'),
          countryCode: z.string().optional().describe('Country code'),
          verificationStatus: z
            .string()
            .optional()
            .describe('Verification status of the address')
        })
        .describe('Validated address')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.addressLabel && (!ctx.input.number || !ctx.input.street)) {
      throw createApiServiceError(
        'Provide addressLabel or both number and street to validate an address.'
      );
    }
    let client = new RadarClient({ token: ctx.auth.token });
    let result = await client.validateAddress({
      city: ctx.input.city,
      stateCode: ctx.input.stateCode,
      postalCode: ctx.input.postalCode,
      countryCode: ctx.input.countryCode,
      number: ctx.input.number,
      street: ctx.input.street,
      unit: ctx.input.unit,
      addressLabel: ctx.input.addressLabel
    });

    let a = result.address || result.addresses?.[0] || {};
    let verificationStatus = result.result?.verificationStatus ?? a.verificationStatus;

    return {
      output: {
        address: {
          latitude: a.latitude,
          longitude: a.longitude,
          formattedAddress: a.formattedAddress,
          addressLabel: a.addressLabel,
          number: a.number,
          street: a.street,
          city: a.city,
          stateCode: a.stateCode,
          postalCode: a.postalCode,
          countryCode: a.countryCode,
          verificationStatus
        }
      },
      message: a.formattedAddress
        ? `Address validated: **${a.formattedAddress}**${verificationStatus ? ` (${verificationStatus})` : ''}.`
        : `Address validation returned no results.`
    };
  })
  .build();
