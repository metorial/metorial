import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  orderItemId: z.number().describe('Order item ID to include'),
  qty: z.number().describe('Quantity to process')
});

let trackSchema = z.object({
  trackNumber: z.string().describe('Tracking number'),
  title: z.string().describe('Tracking title (e.g. carrier name)'),
  carrierCode: z.string().describe('Carrier code (e.g. ups, fedex, usps, dhl, custom)')
});

export let fulfillOrder = SlateTool.create(spec, {
  name: 'Fulfill Order',
  key: 'fulfill_order',
  description: `Process order fulfillment by creating invoices, shipments, or credit memos (refunds). Handles the complete post-order workflow for an order.`,
  instructions: [
    'To **invoice** an order, set action to "invoice". Optionally specify individual line items.',
    'To **ship** an order, set action to "ship". Add tracking numbers using the tracks field.',
    'To **refund** an order, set action to "refund". Specify line items and optional adjustments.',
    'If no lineItems are specified, all eligible items will be processed.'
  ],
  constraints: [
    'An order must be invoiced before it can be shipped.',
    'Refunds require the order to have been invoiced first.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['invoice', 'ship', 'refund']).describe('Fulfillment action to perform'),
      orderId: z.number().describe('Order entity ID'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Specific items to process (omit to process all eligible items)'),
      capture: z
        .boolean()
        .optional()
        .describe('Whether to capture payment when invoicing (default: true)'),
      notify: z.boolean().optional().describe('Whether to notify the customer by email'),
      comment: z
        .string()
        .optional()
        .describe('Comment to include with the fulfillment action'),
      tracks: z
        .array(trackSchema)
        .optional()
        .describe('Tracking information (for ship action)'),
      adjustmentPositive: z
        .number()
        .optional()
        .describe('Adjustment refund amount to add (for refund action)'),
      adjustmentNegative: z
        .number()
        .optional()
        .describe('Adjustment fee to subtract (for refund action)'),
      shippingAmount: z
        .number()
        .optional()
        .describe('Shipping amount to refund (for refund action)')
    })
  )
  .output(
    z.object({
      resultId: z.number().describe('ID of the created invoice, shipment, or credit memo'),
      action: z.string().describe('The fulfillment action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    let items = ctx.input.lineItems?.map(i => ({ order_item_id: i.orderItemId, qty: i.qty }));

    if (ctx.input.action === 'invoice') {
      let invoiceId = await client.createInvoice(ctx.input.orderId, {
        items,
        capture: ctx.input.capture !== false,
        notify: ctx.input.notify,
        comment: ctx.input.comment
      });
      return {
        output: { resultId: invoiceId, action: 'invoice' },
        message: `Created invoice **#${invoiceId}** for order \`${ctx.input.orderId}\`.`
      };
    }

    if (ctx.input.action === 'ship') {
      let tracks = ctx.input.tracks?.map(t => ({
        track_number: t.trackNumber,
        title: t.title,
        carrier_code: t.carrierCode
      }));
      let shipmentId = await client.createShipment(ctx.input.orderId, {
        items,
        tracks,
        notify: ctx.input.notify,
        comment: ctx.input.comment
      });
      return {
        output: { resultId: shipmentId, action: 'ship' },
        message: `Created shipment **#${shipmentId}** for order \`${ctx.input.orderId}\`.`
      };
    }

    // refund
    let creditMemoId = await client.createCreditMemo(ctx.input.orderId, {
      items,
      notify: ctx.input.notify,
      comment: ctx.input.comment,
      adjustmentPositive: ctx.input.adjustmentPositive,
      adjustmentNegative: ctx.input.adjustmentNegative,
      shippingAmount: ctx.input.shippingAmount
    });
    return {
      output: { resultId: creditMemoId, action: 'refund' },
      message: `Created credit memo **#${creditMemoId}** for order \`${ctx.input.orderId}\`.`
    };
  })
  .build();
