import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let orderEventInputSchema = z.object({
  eventType: z.string().describe('Webhook event type'),
  eventId: z.string().describe('Unique event identifier'),
  orderData: z.any().describe('Raw order data from the webhook payload')
});

let amountsSchema = z.object({
  amountProduct: z.number().nullable().describe('Product cost in USD cents'),
  amountShipping: z.number().nullable().describe('Shipping cost in USD cents'),
  amountProcessingFee: z.number().nullable().describe('Processing fee in USD cents'),
  amountPreTaxTotal: z.number().nullable().describe('Subtotal before tax in USD cents'),
  amountTax: z.number().nullable().describe('Tax amount in USD cents'),
  amountTotal: z.number().nullable().describe('Total cost in USD cents')
});

let shipmentSchema = z.object({
  carrier: z.string().nullable().describe('Shipping carrier name'),
  trackingNumber: z.string().nullable().describe('Tracking number'),
  trackingUrl: z.string().nullable().describe('Tracking URL'),
  status: z.string().nullable().describe('Shipment status')
});

let cartItemSchema = z.object({
  productId: z.string().nullable().describe('Product ID'),
  productName: z.string().nullable().describe('Product name'),
  brandName: z.string().nullable().describe('Brand name'),
  quantity: z.number().nullable().describe('Item quantity')
});

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Triggers on order lifecycle events: created, gift opened, gift accepted, thank you note added, shipped, delivered, canceled, and refunded.'
})
  .input(orderEventInputSchema)
  .output(
    z.object({
      orderId: z.string().describe('Order ID'),
      status: z.string().describe('Current order status'),
      referenceId: z.string().nullable().describe('Display reference ID'),
      orderBatchId: z.string().nullable().describe('Parent order batch ID'),
      giftLink: z.string().nullable().describe('Gift link URL'),
      recipientFirstName: z.string().nullable().describe('Recipient first name'),
      recipientLastName: z.string().nullable().describe('Recipient last name'),
      recipientEmail: z.string().nullable().describe('Recipient email'),
      message: z.string().nullable().describe('Gift message'),
      thankYouNote: z.string().nullable().describe('Thank you note from recipient'),
      isSwapped: z.boolean().nullable().describe('Whether the gift was swapped'),
      viewCountRecipient: z.number().nullable().describe('Recipient view count'),
      cartItems: z.array(cartItemSchema).describe('Current cart items'),
      shipments: z.array(shipmentSchema).describe('Shipment tracking details'),
      amounts: amountsSchema.nullable().describe('Cost breakdown'),
      senderFirstName: z.string().nullable().describe('Sender first name'),
      senderLastName: z.string().nullable().describe('Sender last name'),
      senderEmail: z.string().nullable().describe('Sender email'),
      expiresAt: z.string().nullable().describe('Gift expiration timestamp'),
      workspaceId: z.string().nullable().describe('Workspace ID'),
      workspaceName: z.string().nullable().describe('Workspace name')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventId: data.id,
            orderData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let o = ctx.input.orderData || {};

      let cartItems = (o.cart?.items || []).map((item: any) => ({
        productId: item.product?.id || null,
        productName: item.product?.name || null,
        brandName: item.product?.brand?.name || null,
        quantity: item.quantity || null
      }));

      let shipments = (o.shipments || []).map((s: any) => ({
        carrier: s.carrier || null,
        trackingNumber: s.tracking_number || null,
        trackingUrl: s.tracking_url || null,
        status: s.status || null
      }));

      let amounts = o.amounts
        ? {
            amountProduct: o.amounts.amount_product ?? null,
            amountShipping: o.amounts.amount_shipping ?? null,
            amountProcessingFee: o.amounts.amount_processing_fee ?? null,
            amountPreTaxTotal: o.amounts.amount_pre_tax_total ?? null,
            amountTax: o.amounts.amount_tax ?? null,
            amountTotal: o.amounts.amount_total ?? null
          }
        : null;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          orderId: o.id,
          status: o.status,
          referenceId: o.reference_id || null,
          orderBatchId: o.order_batch_id || null,
          giftLink: o.individual_gift_link || null,
          recipientFirstName: o.recipient_first_name || null,
          recipientLastName: o.recipient_last_name || null,
          recipientEmail: o.recipient_email || null,
          message: o.message || null,
          thankYouNote: o.thank_you_note || null,
          isSwapped: o.is_swapped ?? null,
          viewCountRecipient: o.view_count_recipient ?? null,
          cartItems,
          shipments,
          amounts,
          senderFirstName: o.sender?.first_name || null,
          senderLastName: o.sender?.last_name || null,
          senderEmail: o.sender?.email || null,
          expiresAt: o.expires_at || null,
          workspaceId: o.workspace_id || null,
          workspaceName: o.workspace_name || null
        }
      };
    }
  })
  .build();
