import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateAddress = SlateTool.create(spec, {
  name: 'Validate Address',
  key: 'validate_address',
  description: `Validate and normalize a shipping address before submitting an order. Returns the validated/corrected address if successful. Use this to verify recipient addresses are deliverable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().describe('Recipient first name'),
      lastName: z.string().describe('Recipient last name'),
      companyName: z.string().optional().describe('Company name'),
      address1: z.string().describe('Primary address line'),
      address2: z.string().optional().describe('Secondary address line'),
      address3: z.string().optional().describe('Tertiary address line'),
      city: z.string().describe('City'),
      stateCode: z.string().optional().describe('State/province code'),
      province: z.string().optional().describe('Province (non-US)'),
      zipPostalCode: z.string().describe('Postal/ZIP code'),
      countryCode: z.string().describe('Country code (e.g., "us")'),
      phone: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the address is valid'),
      address: z
        .object({
          firstName: z.string().describe('Validated first name'),
          lastName: z.string().describe('Validated last name'),
          companyName: z.string().optional().describe('Validated company name'),
          address1: z.string().describe('Validated address line 1'),
          address2: z.string().optional().describe('Validated address line 2'),
          address3: z.string().optional().describe('Validated address line 3'),
          city: z.string().describe('Validated city'),
          stateCode: z.string().optional().describe('Validated state code'),
          province: z.string().optional().describe('Validated province'),
          zipPostalCode: z.string().describe('Validated postal code'),
          countryCode: z.string().describe('Validated country code')
        })
        .optional()
        .describe('Validated and corrected address'),
      message: z.string().optional().describe('Validation message or error details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.validateRecipientAddress({
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      company_name: ctx.input.companyName ?? '',
      address_1: ctx.input.address1,
      address_2: ctx.input.address2 ?? '',
      address_3: ctx.input.address3 ?? '',
      city: ctx.input.city,
      state_code: ctx.input.stateCode ?? '',
      province: ctx.input.province ?? '',
      zip_postal_code: ctx.input.zipPostalCode,
      country_code: ctx.input.countryCode,
      phone: ctx.input.phone ?? '',
      email: ctx.input.email ?? '',
      address_order_po: ''
    });

    let valid = data.status?.success ?? false;
    let addr = data.address;

    return {
      output: {
        valid,
        address: addr
          ? {
              firstName: addr.first_name ?? '',
              lastName: addr.last_name ?? '',
              companyName: addr.company_name || undefined,
              address1: addr.address_1 ?? '',
              address2: addr.address_2 || undefined,
              address3: addr.address_3 || undefined,
              city: addr.city ?? '',
              stateCode: addr.state_code || undefined,
              province: addr.province || undefined,
              zipPostalCode: addr.zip_postal_code ?? '',
              countryCode: addr.country_code ?? ''
            }
          : undefined,
        message: data.status?.message || undefined
      },
      message: valid
        ? `Address is **valid**: ${addr?.address_1}, ${addr?.city}, ${addr?.state_code} ${addr?.zip_postal_code}, ${addr?.country_code}`
        : `Address validation **failed**: ${data.status?.message ?? 'Unknown error'}`
    };
  })
  .build();
