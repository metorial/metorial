import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateCustomer = SlateTool.create(spec, {
  name: 'Create or Update Customer',
  key: 'create_or_update_customer',
  description: `Create a new customer or update an existing one. If a **customerId** is provided, the customer is updated; otherwise a new customer is created. Customers can be looked up by email or phone number using the List Customers tool before updating.`
})
  .input(
    z.object({
      customerId: z
        .string()
        .optional()
        .describe('Customer ID to update; omit to create a new customer'),
      customerName: z.string().optional().describe('Full name of the customer'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      region: z.string().optional().describe('State or region'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      countryCode: z.string().optional().describe('Country code (e.g., US, GB)'),
      customerCode: z.string().optional().describe('Customer loyalty code'),
      note: z.string().optional().describe('Note about the customer')
    })
  )
  .output(
    z.object({
      customerId: z.string().describe('ID of the created/updated customer'),
      customerName: z.string().nullable().optional().describe('Customer name'),
      email: z.string().nullable().optional().describe('Email address'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.customerId) body.id = ctx.input.customerId;
    if (ctx.input.customerName !== undefined) body.name = ctx.input.customerName;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) body.phone_number = ctx.input.phoneNumber;
    if (ctx.input.address !== undefined) body.address = ctx.input.address;
    if (ctx.input.city !== undefined) body.city = ctx.input.city;
    if (ctx.input.region !== undefined) body.region = ctx.input.region;
    if (ctx.input.postalCode !== undefined) body.postal_code = ctx.input.postalCode;
    if (ctx.input.countryCode !== undefined) body.country_code = ctx.input.countryCode;
    if (ctx.input.customerCode !== undefined) body.customer_code = ctx.input.customerCode;
    if (ctx.input.note !== undefined) body.note = ctx.input.note;

    let result = await client.createOrUpdateCustomer(body);
    let isUpdate = !!ctx.input.customerId;

    return {
      output: {
        customerId: result.id,
        customerName: result.name,
        email: result.email,
        phoneNumber: result.phone_number,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} customer **${result.name ?? result.id}**.`
    };
  })
  .build();
