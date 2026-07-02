import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve full details of a single order including line items, shipping address, billing address, customer info, transactions, fulfillments, and discount information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderId: z.string().describe('Shopify order ID')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      orderNumber: z.number(),
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      totalPrice: z.string(),
      subtotalPrice: z.string(),
      totalTax: z.string(),
      totalDiscounts: z.string(),
      currency: z.string(),
      financialStatus: z.string().nullable(),
      fulfillmentStatus: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      cancelledAt: z.string().nullable(),
      closedAt: z.string().nullable(),
      cancelReason: z.string().nullable(),
      note: z.string().nullable(),
      tags: z.string(),
      lineItems: z.array(
        z.object({
          lineItemId: z.string(),
          title: z.string(),
          quantity: z.number(),
          price: z.string(),
          sku: z.string().nullable(),
          variantId: z.string().nullable(),
          productId: z.string().nullable(),
          variantTitle: z.string().nullable(),
          fulfillmentStatus: z.string().nullable()
        })
      ),
      shippingAddress: z
        .object({
          name: z.string().nullable(),
          address1: z.string().nullable(),
          address2: z.string().nullable(),
          city: z.string().nullable(),
          province: z.string().nullable(),
          country: z.string().nullable(),
          zip: z.string().nullable(),
          phone: z.string().nullable()
        })
        .nullable(),
      billingAddress: z
        .object({
          name: z.string().nullable(),
          address1: z.string().nullable(),
          address2: z.string().nullable(),
          city: z.string().nullable(),
          province: z.string().nullable(),
          country: z.string().nullable(),
          zip: z.string().nullable(),
          phone: z.string().nullable()
        })
        .nullable(),
      customer: z
        .object({
          customerId: z.string(),
          email: z.string().nullable(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable()
        })
        .nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let o = await client.getOrder(ctx.input.orderId);

    let mapAddress = (addr: any) =>
      addr
        ? {
            name: addr.name || null,
            address1: addr.address1 || null,
            address2: addr.address2 || null,
            city: addr.city || null,
            province: addr.province || null,
            country: addr.country || null,
            zip: addr.zip || null,
            phone: addr.phone || null
          }
        : null;

    return {
      output: {
        orderId: String(o.id),
        orderNumber: o.order_number,
        name: o.name,
        email: o.email,
        phone: o.phone,
        totalPrice: o.total_price,
        subtotalPrice: o.subtotal_price,
        totalTax: o.total_tax,
        totalDiscounts: o.total_discounts,
        currency: o.currency,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        cancelledAt: o.cancelled_at,
        closedAt: o.closed_at,
        cancelReason: o.cancel_reason,
        note: o.note,
        tags: o.tags || '',
        lineItems: (o.line_items || []).map((li: any) => ({
          lineItemId: String(li.id),
          title: li.title,
          quantity: li.quantity,
          price: li.price,
          sku: li.sku,
          variantId: li.variant_id ? String(li.variant_id) : null,
          productId: li.product_id ? String(li.product_id) : null,
          variantTitle: li.variant_title,
          fulfillmentStatus: li.fulfillment_status
        })),
        shippingAddress: mapAddress(o.shipping_address),
        billingAddress: mapAddress(o.billing_address),
        customer: o.customer
          ? {
              customerId: String(o.customer.id),
              email: o.customer.email,
              firstName: o.customer.first_name,
              lastName: o.customer.last_name
            }
          : null
      },
      message: `Retrieved order **${o.name}** — ${o.financial_status}, ${o.fulfillment_status || 'unfulfilled'}, total: ${o.total_price} ${o.currency}.`
    };
  })
  .build();
