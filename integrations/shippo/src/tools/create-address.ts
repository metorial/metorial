import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let createAddress = SlateTool.create(spec, {
  name: 'Create Address',
  key: 'create_address',
  description: `Create and optionally validate a shipping address. Addresses are used as sender or recipient in shipments. When validation is enabled, Shippo checks the address for accuracy and provides suggestions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the person or company'),
      company: z.string().optional().describe('Company name'),
      street1: z.string().describe('Street address line 1'),
      street2: z.string().optional().describe('Street address line 2'),
      street3: z.string().optional().describe('Street address line 3'),
      city: z.string().describe('City name'),
      state: z.string().optional().describe('State or province code'),
      zip: z.string().describe('Postal code'),
      country: z.string().describe('ISO 2-letter country code (e.g. US, CA, GB)'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address'),
      isResidential: z.boolean().optional().describe('Whether this is a residential address'),
      validate: z
        .boolean()
        .optional()
        .describe('Set to true to validate the address on creation'),
      metadata: z.string().optional().describe('Custom metadata for the address')
    })
  )
  .output(
    z.object({
      addressId: z.string().describe('Unique identifier for the address'),
      isComplete: z.boolean().optional().describe('Whether the address is complete'),
      validationResults: z
        .any()
        .optional()
        .describe('Address validation results if validation was requested'),
      name: z.string().optional(),
      company: z.string().optional(),
      street1: z.string().optional(),
      street2: z.string().optional(),
      street3: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      isResidential: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.createAddress({
      name: ctx.input.name,
      company: ctx.input.company,
      street1: ctx.input.street1,
      street2: ctx.input.street2,
      street3: ctx.input.street3,
      city: ctx.input.city,
      state: ctx.input.state,
      zip: ctx.input.zip,
      country: ctx.input.country,
      phone: ctx.input.phone,
      email: ctx.input.email,
      is_residential: ctx.input.isResidential,
      validate: ctx.input.validate,
      metadata: ctx.input.metadata
    })) as Record<string, any>;

    return {
      output: {
        addressId: result.object_id,
        isComplete: result.is_complete,
        validationResults: result.validation_results,
        name: result.name,
        company: result.company,
        street1: result.street1,
        street2: result.street2,
        street3: result.street3,
        city: result.city,
        state: result.state,
        zip: result.zip,
        country: result.country,
        phone: result.phone,
        email: result.email,
        isResidential: result.is_residential
      },
      message: `Address created for **${result.name}** (${result.object_id}).${ctx.input.validate ? ` Validation: ${result.validation_results?.is_valid ? 'valid' : 'invalid or needs review'}.` : ''}`
    };
  })
  .build();
