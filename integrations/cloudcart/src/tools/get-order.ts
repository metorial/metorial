import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve full details of a specific order by its ID, including customer info, pricing, statuses, and optional related data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      orderId: z.string(),
      customerId: z.string().optional(),
      customerFirstName: z.string().optional(),
      customerLastName: z.string().optional(),
      customerEmail: z.string().optional(),
      customerIp: z.string().optional(),
      priceProductsSubtotal: z.any().optional(),
      priceSubtotal: z.any().optional(),
      priceTotal: z.any().optional(),
      quantity: z.any().optional(),
      weight: z.any().optional(),
      status: z.string().optional(),
      statusFulfillment: z.string().optional(),
      currency: z.string().optional(),
      vatIncluded: z.any().optional(),
      emailSent: z.any().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      abandoned: z.any().optional(),
      usn: z.string().optional(),
      desiredDeliveryDate: z.string().optional(),
      desiredDeliveryWindow: z.record(z.string(), z.unknown()).optional(),
      noteCustomer: z.string().optional(),
      noteAdministrator: z.string().optional(),
      dateAdded: z.string().optional(),
      updatedAt: z.string().optional(),
      relationships: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let res = await client.getOrder(ctx.input.orderId);
    let o = res.data;
    let deliveryDate = o.attributes.desired_delivery_date;

    return {
      output: {
        raw: res,
        orderId: o.id,
        customerId:
          o.attributes.customer_id == null ? undefined : String(o.attributes.customer_id),
        customerFirstName: o.attributes.customer_first_name ?? undefined,
        customerLastName: o.attributes.customer_last_name ?? undefined,
        customerEmail: o.attributes.customer_email ?? undefined,
        customerIp:
          o.attributes.customer_ip == null ? undefined : String(o.attributes.customer_ip),
        priceProductsSubtotal: o.attributes.price_products_subtotal,
        priceSubtotal: o.attributes.price_subtotal,
        priceTotal: o.attributes.price_total,
        quantity: o.attributes.quantity,
        weight: o.attributes.weight,
        status: o.attributes.status ?? undefined,
        statusFulfillment: o.attributes.status_fulfillment ?? undefined,
        currency: o.attributes.currency ?? undefined,
        vatIncluded: o.attributes.vat_included,
        emailSent: o.attributes.email_sent,
        invoiceNumber:
          o.attributes.invoice_number == null
            ? undefined
            : String(o.attributes.invoice_number),
        invoiceDate: o.attributes.invoice_date ?? undefined,
        abandoned: o.attributes.abandoned,
        usn: o.attributes.usn ?? undefined,
        desiredDeliveryDate: typeof deliveryDate === 'string' ? deliveryDate : undefined,
        desiredDeliveryWindow:
          deliveryDate && typeof deliveryDate === 'object' && !Array.isArray(deliveryDate)
            ? deliveryDate
            : undefined,
        noteCustomer: o.attributes.note_customer ?? undefined,
        noteAdministrator: o.attributes.note_administrator ?? undefined,
        dateAdded: o.attributes.date_added ?? undefined,
        updatedAt: o.attributes.updated_at ?? undefined,
        relationships: o.relationships
      },
      message: `Retrieved order **#${o.id}** — status: **${o.attributes.status}**, total: **${o.attributes.price_total} ${o.attributes.currency || ''}**.`
    };
  })
  .build();
