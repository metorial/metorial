import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve full details of a single customer including addresses, order history summary, and marketing consent status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().describe('Shopify customer ID'),
      includeOrders: z
        .boolean()
        .optional()
        .describe('Also fetch recent orders for this customer')
    })
  )
  .output(
    z.object({
      customerId: z.string(),
      email: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      phone: z.string().nullable(),
      ordersCount: z.number(),
      totalSpent: z.string(),
      state: z.string(),
      tags: z.string(),
      note: z.string().nullable(),
      verifiedEmail: z.boolean(),
      taxExempt: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
      addresses: z.array(
        z.object({
          addressId: z.string(),
          address1: z.string().nullable(),
          address2: z.string().nullable(),
          city: z.string().nullable(),
          province: z.string().nullable(),
          country: z.string().nullable(),
          zip: z.string().nullable(),
          phone: z.string().nullable(),
          isDefault: z.boolean()
        })
      ),
      recentOrders: z
        .array(
          z.object({
            orderId: z.string(),
            name: z.string(),
            totalPrice: z.string(),
            financialStatus: z.string().nullable(),
            fulfillmentStatus: z.string().nullable(),
            createdAt: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let c = await client.getCustomer(ctx.input.customerId);

    let recentOrders: any[] | undefined;
    if (ctx.input.includeOrders) {
      let orders = await client.getCustomerOrders(ctx.input.customerId, { limit: 10 });
      recentOrders = orders.map((o: any) => ({
        orderId: String(o.id),
        name: o.name,
        totalPrice: o.total_price,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        createdAt: o.created_at
      }));
    }

    let result: any = {
      customerId: String(c.id),
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      ordersCount: c.orders_count,
      totalSpent: c.total_spent,
      state: c.state,
      tags: c.tags || '',
      note: c.note,
      verifiedEmail: c.verified_email,
      taxExempt: c.tax_exempt,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      addresses: (c.addresses || []).map((a: any) => ({
        addressId: String(a.id),
        address1: a.address1,
        address2: a.address2,
        city: a.city,
        province: a.province,
        country: a.country,
        zip: a.zip,
        phone: a.phone,
        isDefault: a.default === true
      }))
    };

    if (recentOrders) {
      result.recentOrders = recentOrders;
    }

    return {
      output: result,
      message: `Retrieved customer **${c.first_name || ''} ${c.last_name || ''}** (${c.email || 'no email'}) — ${c.orders_count} orders, ${c.total_spent} spent.`
    };
  })
  .build();
