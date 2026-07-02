import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer in Altoviz. You can update by Altoviz customer ID or by your own internal ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Altoviz customer ID'),
      internalId: z
        .string()
        .optional()
        .describe('Your custom internal ID (used if customerId is not provided)'),
      email: z.string().optional(),
      lastName: z.string().optional(),
      firstName: z.string().optional(),
      companyName: z.string().optional(),
      phone: z.string().optional(),
      cellPhone: z.string().optional(),
      type: z.string().optional(),
      title: z.string().optional(),
      number: z.string().optional().describe('Customer number'),
      billingAddress: z
        .object({
          street: z.string().optional(),
          zipcode: z.string().optional(),
          city: z.string().optional(),
          countryIso: z.string().optional()
        })
        .optional(),
      shippingAddress: z
        .object({
          street: z.string().optional(),
          zipcode: z.string().optional(),
          city: z.string().optional(),
          countryIso: z.string().optional()
        })
        .optional(),
      companyInformations: z
        .object({
          siret: z.string().optional(),
          vatNumber: z.string().optional()
        })
        .optional(),
      billingOptions: z
        .object({
          discount: z
            .object({
              type: z.string().optional(),
              value: z.number().optional()
            })
            .optional(),
          vatReverseCharge: z.boolean().optional(),
          vendorReference: z.string().optional()
        })
        .optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Altoviz customer ID'),
      number: z.string().nullable().optional(),
      companyName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let resolvedId = ctx.input.customerId;
    if (!resolvedId && ctx.input.internalId) {
      let customer = await client.getCustomerByInternalId(ctx.input.internalId);
      resolvedId = customer.id;
    }
    if (!resolvedId) {
      throw new Error('Either customerId or internalId must be provided');
    }

    let { customerId: _, internalId: __, ...updateData } = ctx.input;
    let result = await client.updateCustomer(resolvedId, updateData);

    return {
      output: {
        customerId: result.id,
        number: result.number,
        companyName: result.companyName,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email
      },
      message: `Updated customer **${result.companyName || [result.firstName, result.lastName].filter(Boolean).join(' ')}** (ID: ${result.id}).`
    };
  })
  .build();
