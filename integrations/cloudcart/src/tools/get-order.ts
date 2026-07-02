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

    return {
      output: {
        orderId: o.id,
        customerId: o.attributes.customer_id,
        customerFirstName: o.attributes.customer_first_name,
        customerLastName: o.attributes.customer_last_name,
        customerEmail: o.attributes.customer_email,
        customerIp: o.attributes.customer_ip,
        priceProductsSubtotal: o.attributes.price_products_subtotal,
        priceSubtotal: o.attributes.price_subtotal,
        priceTotal: o.attributes.price_total,
        quantity: o.attributes.quantity,
        weight: o.attributes.weight,
        status: o.attributes.status,
        statusFulfillment: o.attributes.status_fulfillment,
        currency: o.attributes.currency,
        vatIncluded: o.attributes.vat_included,
        emailSent: o.attributes.email_sent,
        invoiceNumber: o.attributes.invoice_number,
        invoiceDate: o.attributes.invoice_date,
        abandoned: o.attributes.abandoned,
        usn: o.attributes.usn,
        desiredDeliveryDate: o.attributes.desired_delivery_date,
        noteCustomer: o.attributes.note_customer,
        noteAdministrator: o.attributes.note_administrator,
        dateAdded: o.attributes.date_added,
        updatedAt: o.attributes.updated_at,
        relationships: o.relationships
      },
      message: `Retrieved order **#${o.id}** — status: **${o.attributes.status}**, total: **${o.attributes.price_total} ${o.attributes.currency || ''}**.`
    };
  })
  .build();
