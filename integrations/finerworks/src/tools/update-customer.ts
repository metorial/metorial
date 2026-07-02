import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Order Customer',
  key: 'update_customer',
  description: `Update the recipient/shipping address information for an existing order after it has been submitted. All address fields must be provided when updating.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('FinerWorks order ID to update'),
      firstName: z.string().describe('Recipient first name'),
      lastName: z.string().describe('Recipient last name'),
      companyName: z.string().optional().describe('Company name'),
      address1: z.string().describe('Primary address line'),
      address2: z.string().optional().describe('Secondary address line'),
      address3: z.string().optional().describe('Tertiary address line'),
      city: z.string().describe('City'),
      stateCode: z.string().optional().describe('State/province code'),
      province: z.string().optional().describe('Province name (non-US addresses)'),
      zipPostalCode: z.string().describe('Postal/ZIP code'),
      countryCode: z.string().describe('Country code (e.g., "us")'),
      phone: z.string().optional().describe('Contact phone number'),
      email: z.string().optional().describe('Contact email')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      message: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.updateCustomer(ctx.input.orderId, {
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

    let success = data.success ?? false;

    return {
      output: {
        success,
        message: data.message || undefined
      },
      message: success
        ? `Updated shipping address for order **${ctx.input.orderId}** to ${ctx.input.firstName} ${ctx.input.lastName}, ${ctx.input.city}, ${ctx.input.countryCode}`
        : `Failed to update customer for order ${ctx.input.orderId}: ${data.message ?? 'Unknown error'}`
    };
  })
  .build();
