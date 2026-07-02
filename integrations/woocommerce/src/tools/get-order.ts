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

let lineItemSchema = z.object({
  lineItemId: z.number(),
  name: z.string(),
  productId: z.number(),
  variationId: z.number(),
  quantity: z.number(),
  subtotal: z.string(),
  total: z.string(),
  totalTax: z.string(),
  sku: z.string(),
  price: z.number()
});

let shippingLineSchema = z.object({
  shippingLineId: z.number(),
  methodTitle: z.string(),
  methodId: z.string(),
  total: z.string()
});

let feeLineSchema = z.object({
  feeLineId: z.number(),
  name: z.string(),
  total: z.string(),
  totalTax: z.string()
});

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve complete details of a specific order including line items, shipping, billing addresses, payment info, fees, and tax information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The order ID to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.number(),
      orderNumber: z.string(),
      status: z.string(),
      currency: z.string(),
      total: z.string(),
      subtotal: z.string(),
      totalTax: z.string(),
      shippingTotal: z.string(),
      discountTotal: z.string(),
      discountTax: z.string(),
      customerId: z.number(),
      customerNote: z.string(),
      billing: addressSchema,
      shipping: addressSchema,
      paymentMethod: z.string(),
      paymentMethodTitle: z.string(),
      transactionId: z.string(),
      datePaid: z.string().nullable(),
      dateCompleted: z.string().nullable(),
      lineItems: z.array(lineItemSchema),
      shippingLines: z.array(shippingLineSchema),
      feeLines: z.array(feeLineSchema),
      couponLines: z.array(
        z.object({
          couponLineId: z.number(),
          code: z.string(),
          discount: z.string(),
          discountTax: z.string()
        })
      ),
      dateCreated: z.string(),
      dateModified: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let o = await client.getOrder(ctx.input.orderId);

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
        orderId: o.id,
        orderNumber: o.number || String(o.id),
        status: o.status,
        currency: o.currency || '',
        total: o.total || '0',
        subtotal: o.subtotal || '0',
        totalTax: o.total_tax || '0',
        shippingTotal: o.shipping_total || '0',
        discountTotal: o.discount_total || '0',
        discountTax: o.discount_tax || '0',
        customerId: o.customer_id || 0,
        customerNote: o.customer_note || '',
        billing: mapAddress(o.billing),
        shipping: mapAddress(o.shipping),
        paymentMethod: o.payment_method || '',
        paymentMethodTitle: o.payment_method_title || '',
        transactionId: o.transaction_id || '',
        datePaid: o.date_paid || null,
        dateCompleted: o.date_completed || null,
        lineItems: (o.line_items || []).map((li: any) => ({
          lineItemId: li.id,
          name: li.name,
          productId: li.product_id,
          variationId: li.variation_id || 0,
          quantity: li.quantity,
          subtotal: li.subtotal || '0',
          total: li.total || '0',
          totalTax: li.total_tax || '0',
          sku: li.sku || '',
          price: li.price || 0
        })),
        shippingLines: (o.shipping_lines || []).map((sl: any) => ({
          shippingLineId: sl.id,
          methodTitle: sl.method_title || '',
          methodId: sl.method_id || '',
          total: sl.total || '0'
        })),
        feeLines: (o.fee_lines || []).map((fl: any) => ({
          feeLineId: fl.id,
          name: fl.name || '',
          total: fl.total || '0',
          totalTax: fl.total_tax || '0'
        })),
        couponLines: (o.coupon_lines || []).map((cl: any) => ({
          couponLineId: cl.id,
          code: cl.code || '',
          discount: cl.discount || '0',
          discountTax: cl.discount_tax || '0'
        })),
        dateCreated: o.date_created || '',
        dateModified: o.date_modified || ''
      },
      message: `Retrieved order **#${o.number || o.id}** (status: ${o.status}, total: ${o.currency_symbol || ''}${o.total}).`
    };
  })
  .build();
