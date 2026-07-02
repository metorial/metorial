import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Verify that a mailing address is valid and deliverable before sending mail. Currently supports US and UK addresses.`,
  constraints: ['Only US and UK addresses can be validated.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      company: z.string().optional().describe('Company or organization name'),
      address1: z.string().optional().describe('Primary address line'),
      address2: z.string().optional().describe('Secondary address line'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State (two-letter abbreviation preferred)'),
      zipcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('ISO 3166-1 Alpha-2 country code (US or GB)')
    })
  )
  .output(
    z.object({
      isValid: z.boolean().describe('Whether the address is valid and deliverable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.validateAddress(ctx.input);

    return {
      output: {
        isValid: result.is_valid === true
      },
      message: result.is_valid
        ? 'Address is **valid** and deliverable.'
        : 'Address is **invalid** or undeliverable.'
    };
  })
  .build();
