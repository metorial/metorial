import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's status, addresses, payment method, or customer note. Commonly used to change order status (e.g., mark as completed or on-hold).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The order ID to update'),
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
        .describe('New order status'),
      customerNote: z.string().optional().describe('Customer note'),
      billing: z
        .object({
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
        })
        .optional()
        .describe('Updated billing address'),
      shipping: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          company: z.string().optional(),
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postcode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Updated shipping address'),
      paymentMethod: z.string().optional().describe('Payment method ID'),
      paymentMethodTitle: z.string().optional().describe('Payment method title'),
      transactionId: z.string().optional().describe('Transaction ID')
    })
  )
  .output(
    z.object({
      orderId: z.number(),
      orderNumber: z.string(),
      status: z.string(),
      total: z.string(),
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

    if (input.status) data.status = input.status;
    if (input.customerNote !== undefined) data.customer_note = input.customerNote;
    if (input.billing) data.billing = mapAddressToApi(input.billing);
    if (input.shipping) data.shipping = mapAddressToApi(input.shipping);
    if (input.paymentMethod) data.payment_method = input.paymentMethod;
    if (input.paymentMethodTitle) data.payment_method_title = input.paymentMethodTitle;
    if (input.transactionId) data.transaction_id = input.transactionId;

    let order = await client.updateOrder(input.orderId, data);

    return {
      output: {
        orderId: order.id,
        orderNumber: order.number || String(order.id),
        status: order.status,
        total: order.total || '0',
        dateModified: order.date_modified || ''
      },
      message: `Updated order **#${order.number || order.id}** (status: ${order.status}).`
    };
  })
  .build();
