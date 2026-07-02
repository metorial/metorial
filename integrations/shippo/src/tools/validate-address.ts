import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate an existing address to check for accuracy and prevent failed deliveries. Returns validation results with any suggested corrections.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address to validate')
    })
  )
  .output(
    z.object({
      addressId: z.string().describe('ID of the validated address'),
      isValid: z.boolean().optional().describe('Whether the address is valid'),
      validationResults: z
        .any()
        .optional()
        .describe('Detailed validation results including messages and suggestions'),
      name: z.string().optional(),
      street1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.validateAddress(ctx.input.addressId)) as Record<string, any>;

    return {
      output: {
        addressId: result.object_id,
        isValid: result.validation_results?.is_valid,
        validationResults: result.validation_results,
        name: result.name,
        street1: result.street1,
        city: result.city,
        state: result.state,
        zip: result.zip,
        country: result.country
      },
      message: `Address **${result.name}** validation: ${result.validation_results?.is_valid ? '✅ valid' : '❌ invalid or needs review'}.`
    };
  })
  .build();
