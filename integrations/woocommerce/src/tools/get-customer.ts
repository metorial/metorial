import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string(),
  address1: z.string(),
  address2: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  email: z.string().optional(),
  phone: z.string().optional()
});

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer including billing/shipping addresses, order history stats, and account details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().describe('The customer ID to retrieve')
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
      billing: addressSchema,
      shipping: addressSchema,
      ordersCount: z.number(),
      totalSpent: z.string(),
      avatarUrl: z.string(),
      isPayingCustomer: z.boolean(),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let c = await client.getCustomer(ctx.input.customerId);

    let mapAddress = (a: any) => ({
      firstName: a?.first_name || '',
      lastName: a?.last_name || '',
      company: a?.company || '',
      address1: a?.address_1 || '',
      address2: a?.address_2 || '',
      city: a?.city || '',
      state: a?.state || '',
      postcode: a?.postcode || '',
      country: a?.country || '',
      email: a?.email || undefined,
      phone: a?.phone || undefined
    });

    return {
      output: {
        customerId: c.id,
        email: c.email || '',
        firstName: c.first_name || '',
        lastName: c.last_name || '',
        username: c.username || '',
        role: c.role || '',
        billing: mapAddress(c.billing),
        shipping: mapAddress(c.shipping),
        ordersCount: c.orders_count || 0,
        totalSpent: c.total_spent || '0',
        avatarUrl: c.avatar_url || '',
        isPayingCustomer: c.is_paying_customer || false,
        dateCreated: c.date_created || '',
        dateModified: c.date_modified || ''
      },
      message: `Retrieved customer **${c.first_name || ''} ${c.last_name || ''}** (ID: ${c.id}, email: ${c.email}).`
    };
  })
  .build();
