import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventIdSchema, overrideLocationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve buyer details, payment information, status, and financial breakdown for a Humanitix order. Call list_events to discover event IDs, then list_orders to discover internal order IDs.`,
  instructions: [
    'The internal order ID is different from the buyer-facing "Order ID" (e.g., "7QVD6HEL"). Use orderId from list_orders or the Humanitix console URL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: eventIdSchema,
      orderId: z
        .string()
        .describe(
          'The internal order ID to retrieve. Call list_orders to discover order IDs.'
        ),
      overrideLocation: overrideLocationSchema
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Internal unique order ID'),
      orderName: z.string().optional().describe('Buyer-facing order name/reference'),
      firstName: z.string().optional().describe('Buyer first name'),
      lastName: z.string().optional().describe('Buyer last name'),
      email: z.string().optional().describe('Buyer email address'),
      mobile: z.string().optional().describe('Buyer mobile number'),
      location: z.any().optional().describe('Buyer location details'),
      status: z.string().optional().describe('Order status'),
      financialStatus: z.string().optional().describe('Financial status of the order'),
      paymentType: z.string().optional().describe('Payment method used'),
      paymentGateway: z.string().optional().describe('Payment gateway used'),
      purchaseTotals: z.any().optional().describe('Purchase totals breakdown'),
      totals: z.any().optional().describe('Itemized totals including fees and taxes'),
      eventId: z.string().optional().describe('ID of the associated event'),
      eventDateId: z.string().optional().describe('ID of the specific event date'),
      manualOrder: z
        .boolean()
        .optional()
        .describe('Whether this was a manually created order'),
      businessPurpose: z
        .string()
        .optional()
        .describe(
          'Business purpose for the order; boolean values are represented as true or false text.'
        ),
      isBusinessPurpose: z
        .boolean()
        .optional()
        .describe('Whether this order was purchased for a business purpose.'),
      createdAt: z.string().optional().describe('When the order was created'),
      completedAt: z.string().optional().describe('When the order was completed'),
      incompleteAt: z.string().optional().describe('When the order was marked incomplete'),
      updatedAt: z.string().optional().describe('When the order was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let order = await client.getOrder(ctx.input.eventId, ctx.input.orderId, {
      overrideLocation: ctx.input.overrideLocation
    });

    return {
      output: {
        orderId: order._id,
        orderName: order.orderName,
        firstName: order.firstName,
        lastName: order.lastName,
        email: order.email,
        mobile: order.mobile,
        location: order.location,
        status: order.status,
        financialStatus: order.financialStatus,
        paymentType: order.paymentType,
        paymentGateway: order.paymentGateway,
        purchaseTotals: order.purchaseTotals,
        totals: order.totals,
        eventId: order.eventId,
        eventDateId: order.eventDateId,
        manualOrder: order.manualOrder,
        businessPurpose:
          typeof order.businessPurpose === 'boolean'
            ? String(order.businessPurpose)
            : order.businessPurpose,
        isBusinessPurpose:
          typeof order.businessPurpose === 'boolean' ? order.businessPurpose : undefined,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        incompleteAt: order.incompleteAt,
        updatedAt: order.updatedAt
      },
      message: `Retrieved order **${order.orderName || ctx.input.orderId}** for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
