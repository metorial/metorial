import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's information including name, email, phone, tags, note, and tax exemption status.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      customerId: z.string().describe('Shopify customer ID'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      phone: z.string().optional().describe('New phone number'),
      tags: z.string().optional().describe('New comma-separated tags (replaces existing)'),
      note: z.string().optional().describe('New internal note'),
      taxExempt: z.boolean().optional().describe('Tax exemption status')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      tags: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let customerData: Record<string, any> = {};
    if (ctx.input.email !== undefined) customerData.email = ctx.input.email;
    if (ctx.input.firstName !== undefined) customerData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) customerData.last_name = ctx.input.lastName;
    if (ctx.input.phone !== undefined) customerData.phone = ctx.input.phone;
    if (ctx.input.tags !== undefined) customerData.tags = ctx.input.tags;
    if (ctx.input.note !== undefined) customerData.note = ctx.input.note;
    if (ctx.input.taxExempt !== undefined) customerData.tax_exempt = ctx.input.taxExempt;

    let c = await client.updateCustomer(ctx.input.customerId, customerData);

    return {
      output: {
        customerId: String(c.id),
        email: c.email,
        firstName: c.first_name,
        lastName: c.last_name,
        tags: c.tags || '',
        updatedAt: c.updated_at
      },
      message: `Updated customer **${c.first_name || ''} ${c.last_name || ''}**.`
    };
  })
  .build();
