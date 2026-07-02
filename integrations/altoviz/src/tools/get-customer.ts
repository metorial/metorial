import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street: z.string().nullable().optional(),
    zipcode: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    countryIso: z.string().nullable().optional(),
    formattedAddress: z.string().nullable().optional(),
    inlineAddress: z.string().nullable().optional()
  })
  .optional()
  .nullable();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a single customer from Altoviz by their Altoviz ID, internal ID, or email address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Altoviz customer ID'),
      internalId: z.string().optional().describe('Your custom internal ID'),
      email: z.string().optional().describe('Customer email address')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Altoviz customer ID'),
      number: z.string().nullable().optional(),
      companyName: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      cellPhone: z.string().nullable().optional(),
      type: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      billingAddress: addressSchema,
      shippingAddress: addressSchema,
      internalId: z.string().nullable().optional(),
      companyInformations: z
        .object({
          siret: z.string().nullable().optional(),
          vatNumber: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
      billingOptions: z
        .object({
          discount: z
            .object({
              type: z.string().nullable().optional(),
              value: z.number().nullable().optional()
            })
            .nullable()
            .optional(),
          vatReverseCharge: z.boolean().nullable().optional(),
          vendorReference: z.string().nullable().optional()
        })
        .nullable()
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customer: any;

    if (ctx.input.customerId) {
      customer = await client.getCustomer(ctx.input.customerId);
    } else if (ctx.input.internalId) {
      customer = await client.getCustomerByInternalId(ctx.input.internalId);
    } else if (ctx.input.email) {
      let results = await client.getCustomerByEmail(ctx.input.email);
      if (!results || results.length === 0) {
        throw new Error(`No customer found with email: ${ctx.input.email}`);
      }
      customer = results[0];
    } else {
      throw new Error('One of customerId, internalId, or email must be provided');
    }

    return {
      output: {
        customerId: customer.id,
        number: customer.number,
        companyName: customer.companyName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        cellPhone: customer.cellPhone,
        type: customer.type,
        title: customer.title,
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress,
        internalId: customer.internalId,
        companyInformations: customer.companyInformations,
        billingOptions: customer.billingOptions
      },
      message: `Retrieved customer **${customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(' ')}** (ID: ${customer.id}).`
    };
  })
  .build();
