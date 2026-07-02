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

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's profile including name, email, billing and shipping addresses. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to update'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      billing: addressInputSchema.optional().describe('Updated billing address'),
      shipping: addressInputSchema.optional().describe('Updated shipping address')
    })
  )
  .output(
    z.object({
      customerId: z.number(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      dateModified: z.string()
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

    let data: Record<string, any> = {};

    if (input.email) data.email = input.email;
    if (input.firstName) data.first_name = input.firstName;
    if (input.lastName) data.last_name = input.lastName;
    if (input.billing) data.billing = mapAddressToApi(input.billing);
    if (input.shipping) data.shipping = mapAddressToApi(input.shipping);

    let customer = await client.updateCustomer(input.customerId, data);

    return {
      output: {
        customerId: customer.id,
        email: customer.email || '',
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        dateModified: customer.date_modified || ''
      },
      message: `Updated customer **${customer.first_name || ''} ${customer.last_name || ''}** (ID: ${customer.id}).`
    };
  })
  .build();
