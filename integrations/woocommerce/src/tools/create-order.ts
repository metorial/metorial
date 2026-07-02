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

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order in the store. Add line items, set billing/shipping addresses, apply coupons, and configure shipping and fees. Use setPaid to immediately mark the order as paid.`,
  instructions: [
    'Setting setPaid to true will set the order status to "processing" and reduce stock for items.',
    'Line items require either a productId or a custom name and price.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'pending',
          'processing',
          'on-hold',
          'completed',
          'cancelled',
          'refunded',
          'failed'
        ])
        .optional()
        .describe('Order status (default: pending)'),
      customerId: z
        .number()
        .optional()
        .describe('Assign to existing customer ID (0 for guest)'),
      customerNote: z.string().optional().describe('Note from the customer'),
      billing: addressInputSchema.optional().describe('Billing address'),
      shipping: addressInputSchema.optional().describe('Shipping address'),
      lineItems: z
        .array(
          z.object({
            productId: z.number().optional().describe('Product ID'),
            variationId: z.number().optional().describe('Variation ID'),
            quantity: z.number().describe('Quantity'),
            name: z.string().optional().describe('Custom item name (if no productId)'),
            total: z.string().optional().describe('Custom line total')
          })
        )
        .optional()
        .describe('Order line items'),
      shippingLines: z
        .array(
          z.object({
            methodId: z.string().describe('Shipping method ID'),
            methodTitle: z.string().describe('Shipping method title'),
            total: z.string().describe('Shipping total')
          })
        )
        .optional()
        .describe('Shipping lines'),
      feeLines: z
        .array(
          z.object({
            name: z.string().describe('Fee name'),
            total: z.string().describe('Fee total')
          })
        )
        .optional()
        .describe('Fee lines'),
      couponLines: z
        .array(
          z.object({
            code: z.string().describe('Coupon code')
          })
        )
        .optional()
        .describe('Applied coupon codes'),
      paymentMethod: z.string().optional().describe('Payment method ID'),
      paymentMethodTitle: z.string().optional().describe('Payment method display title'),
      setPaid: z
        .boolean()
        .optional()
        .default(false)
        .describe('Mark order as paid on creation'),
      currency: z.string().optional().describe('Currency code (e.g., USD)')
    })
  )
  .output(
    z.object({
      orderId: z.number(),
      orderNumber: z.string(),
      status: z.string(),
      total: z.string(),
      currency: z.string(),
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

    let data: Record<string, any> = {};

    if (input.status) data.status = input.status;
    if (input.customerId !== undefined) data.customer_id = input.customerId;
    if (input.customerNote) data.customer_note = input.customerNote;
    if (input.billing) data.billing = mapAddressToApi(input.billing);
    if (input.shipping) data.shipping = mapAddressToApi(input.shipping);
    if (input.paymentMethod) data.payment_method = input.paymentMethod;
    if (input.paymentMethodTitle) data.payment_method_title = input.paymentMethodTitle;
    if (input.setPaid) data.set_paid = input.setPaid;
    if (input.currency) data.currency = input.currency;

    if (input.lineItems) {
      data.line_items = input.lineItems.map(li => {
        let item: Record<string, any> = { quantity: li.quantity };
        if (li.productId) item.product_id = li.productId;
        if (li.variationId) item.variation_id = li.variationId;
        if (li.name) item.name = li.name;
        if (li.total) item.total = li.total;
        return item;
      });
    }

    if (input.shippingLines) {
      data.shipping_lines = input.shippingLines.map(sl => ({
        method_id: sl.methodId,
        method_title: sl.methodTitle,
        total: sl.total
      }));
    }

    if (input.feeLines) {
      data.fee_lines = input.feeLines.map(fl => ({
        name: fl.name,
        total: fl.total
      }));
    }

    if (input.couponLines) {
      data.coupon_lines = input.couponLines.map(cl => ({
        code: cl.code
      }));
    }

    let order = await client.createOrder(data);

    return {
      output: {
        orderId: order.id,
        orderNumber: order.number || String(order.id),
        status: order.status,
        total: order.total || '0',
        currency: order.currency || '',
        dateCreated: order.date_created || ''
      },
      message: `Created order **#${order.number || order.id}** (status: ${order.status}, total: ${order.total}).`
    };
  })
  .build();
