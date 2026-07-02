import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let addressInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional()
});

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer account in the store with email, name, billing and shipping addresses.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Customer email address (required, must be unique)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      username: z
        .string()
        .optional()
        .describe('Username (auto-generated from email if not provided)'),
      password: z.string().optional().describe('Customer password'),
      billing: addressInputSchema.optional().describe('Billing address'),
      shipping: addressInputSchema.optional().describe('Shipping address')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      username: z.string(),
      role: z.string(),
      dateCreated: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let mapAddressToApi = (addr: any) => {
      let result: Record<string, any> = {};
      if (addr.firstName !== undefined) result.first_name = addr.firstName;
      if (addr.lastName !== undefined) result.last_name = addr.lastName;
      if (addr.company !== undefined) result.company = addr.company;
      if (addr.address1 !== undefined) result.address_1 = addr.address1;
      if (addr.address2 !== undefined) result.address_2 = addr.address2;
      if (addr.city !== undefined) result.city = addr.city;
      if (addr.state !== undefined) result.state = addr.state;
      if (addr.postcode !== undefined) result.postcode = addr.postcode;
      if (addr.country !== undefined) result.country = addr.country;
      if (addr.email !== undefined) result.email = addr.email;
      if (addr.phone !== undefined) result.phone = addr.phone;
      return result;
    };

    let data: Record<string, any> = { email: input.email };

    if (input.firstName) data.first_name = input.firstName;
    if (input.lastName) data.last_name = input.lastName;
    if (input.username) data.username = input.username;
    if (input.password) data.password = input.password;
    if (input.billing) data.billing = mapAddressToApi(input.billing);
    if (input.shipping) data.shipping = mapAddressToApi(input.shipping);

    let customer = await client.createCustomer(data);

    return {
      output: {
        customerId: customer.id,
        email: customer.email || '',
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        username: customer.username || '',
        role: customer.role || '',
        dateCreated: customer.date_created || ''
      },
      message: `Created customer **${customer.first_name || ''} ${customer.last_name || ''}** (ID: ${customer.id}, email: ${customer.email}).`
    };
  })
  .build();
