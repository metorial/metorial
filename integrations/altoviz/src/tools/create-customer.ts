import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer in Altoviz. Provide customer details including name, email, and optional billing/shipping addresses.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email address'),
      lastName: z.string().describe('Customer last name'),
      number: z.string().optional().describe('Customer number/code (e.g. C001001)'),
      firstName: z.string().optional().describe('Customer first name'),
      companyName: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Phone number'),
      cellPhone: z.string().optional().describe('Cell phone number'),
      type: z.string().optional().describe('Customer type (e.g. Company, Individual)'),
      title: z.string().optional().describe('Customer title'),
      internalId: z
        .string()
        .optional()
        .describe('Your custom internal ID for mapping to your own system'),
      billingAddress: z
        .object({
          street: z.string().optional(),
          zipcode: z.string().optional(),
          city: z.string().optional(),
          countryIso: z.string().optional().describe('Country ISO code (e.g. FR, US)')
        })
        .optional()
        .describe('Billing address'),
      shippingAddress: z
        .object({
          street: z.string().optional(),
          zipcode: z.string().optional(),
          city: z.string().optional(),
          countryIso: z.string().optional().describe('Country ISO code (e.g. FR, US)')
        })
        .optional()
        .describe('Shipping address'),
      companyInformations: z
        .object({
          siret: z.string().optional(),
          vatNumber: z.string().optional()
        })
        .optional()
        .describe('Company information for business customers'),
      billingOptions: z
        .object({
          discount: z
            .object({
              type: z.string().optional().describe('Discount type (e.g. Percent, Amount)'),
              value: z.number().optional().describe('Discount value')
            })
            .optional(),
          vatReverseCharge: z.boolean().optional(),
          vendorReference: z.string().optional()
        })
        .optional(),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Altoviz customer ID'),
      number: z.string().nullable().optional().describe('Customer number'),
      companyName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCustomer(ctx.input);

    return {
      output: {
        customerId: result.id,
        number: result.number,
        companyName: result.companyName,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email
      },
      message: `Created customer **${result.companyName || [result.firstName, result.lastName].filter(Boolean).join(' ')}** (ID: ${result.id}).`
    };
  })
  .build();
