import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer record in the Shopify store. Supports email, phone, address, tags, notes, and marketing consent.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      email: z.string().optional().describe('Customer email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number in E.164 format'),
      tags: z.string().optional().describe('Comma-separated tags'),
      note: z.string().optional().describe('Internal note about the customer'),
      taxExempt: z.boolean().optional().describe('Whether the customer is tax exempt'),
      sendEmailInvite: z
        .boolean()
        .optional()
        .describe('Send an email invite to the customer to create an account'),
      addresses: z
        .array(
          z.object({
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            country: z.string().optional(),
            zip: z.string().optional(),
            phone: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional()
          })
        )
        .optional()
        .describe('Customer addresses')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      state: z.string(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let customerData: Record<string, any> = {};
    if (ctx.input.email) customerData.email = ctx.input.email;
    if (ctx.input.firstName) customerData.first_name = ctx.input.firstName;
    if (ctx.input.lastName) customerData.last_name = ctx.input.lastName;
    if (ctx.input.phone) customerData.phone = ctx.input.phone;
    if (ctx.input.tags) customerData.tags = ctx.input.tags;
    if (ctx.input.note) customerData.note = ctx.input.note;
    if (ctx.input.taxExempt !== undefined) customerData.tax_exempt = ctx.input.taxExempt;
    if (ctx.input.sendEmailInvite) customerData.send_email_invite = ctx.input.sendEmailInvite;

    if (ctx.input.addresses) {
      customerData.addresses = ctx.input.addresses.map(a => ({
        address1: a.address1,
        address2: a.address2,
        city: a.city,
        province: a.province,
        country: a.country,
        zip: a.zip,
        phone: a.phone,
        first_name: a.firstName,
        last_name: a.lastName
      }));
    }

    let c = await client.createCustomer(customerData);

    return {
      output: {
        customerId: String(c.id),
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        state: c.state,
        createdAt: c.created_at
      },
      message: `Created customer **${c.first_name || ''} ${c.last_name || ''}** (${c.email || 'no email'}).`
    };
  })
  .build();
