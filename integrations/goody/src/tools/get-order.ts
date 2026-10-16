import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

let shipmentSchema = z.object({
  carrier: z.string().nullable().describe('Shipping carrier name'),
  trackingNumber: z.string().nullable().describe('Tracking number'),
  trackingUrl: z.string().nullable().describe('Tracking URL'),
  status: z.string().nullable().describe('Shipment status')
});

let amountsSchema = z.object({
  amountProduct: z.number().describe('Product cost in USD cents'),
  amountShipping: z.number().describe('Shipping cost in USD cents'),
  amountProcessingFee: z.number().nullable().describe('Processing fee in USD cents'),
  amountPreTaxTotal: z.number().describe('Subtotal before tax in USD cents'),
  amountTax: z.number().nullable().describe('Tax amount in USD cents'),
  amountTotal: z.number().nullable().describe('Total cost in USD cents')
});

let cartItemSchema = z.object({
  productId: z.string().describe('Product ID'),
  productName: z.string().describe('Product name'),
  brandName: z.string().describe('Brand name'),
  quantity: z.number().describe('Item quantity'),
  price: z
    .number()
    .optional()
    .describe(
      'Item price in USD cents, when Goody supplies an item price; aggregate costs are returned in amounts'
    )
});

let eventTimesSchema = z.object({
  createdAt: z.string().nullable().describe('When the order was created'),
  notifiedAt: z.string().nullable().describe('When the recipient was notified'),
  openedAt: z.string().nullable().describe('When the recipient opened the gift'),
  acceptedAt: z.string().nullable().describe('When the recipient accepted the gift'),
  shippedAt: z.string().nullable().describe('When the first shipment began transit'),
  deliveredAt: z.string().nullable().describe('When all shipments were delivered')
});

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve detailed information about a specific order including status, recipient details, cart items, shipping, costs, and the full event timeline.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order identifier'),
      status: z.string().describe('Current order status'),
      referenceId: z.string().describe('Display reference ID'),
      giftLink: z.string().describe('Gift link URL'),
      recipientFirstName: z.string().describe('Recipient first name'),
      recipientLastName: z.string().nullable().describe('Recipient last name'),
      recipientEmail: z.string().nullable().describe('Recipient email'),
      message: z.string().nullable().describe('Gift message'),
      thankYouNote: z.string().nullable().describe('Thank you note from recipient'),
      isSwapped: z.boolean().describe('Whether the gift was swapped by the recipient'),
      viewCountRecipient: z.number().describe('Number of times the recipient viewed the gift'),
      orderBatchId: z.string().describe('Parent order batch ID'),
      cartItems: z.array(cartItemSchema).describe('Current cart items'),
      shipments: z.array(shipmentSchema).describe('Shipment tracking details'),
      amounts: amountsSchema.describe('Cost breakdown'),
      senderEmail: z.string().nullable().describe('Sender email'),
      senderFirstName: z.string().nullable().describe('Sender first name'),
      senderLastName: z.string().nullable().describe('Sender last name'),
      eventTimes: eventTimesSchema.describe('Order lifecycle timestamps'),
      expiresAt: z.string().nullable().describe('Gift expiration timestamp'),
      paymentLink: z.string().nullable().describe('Hosted payment form link'),
      workspaceId: z.string().nullable().describe('Workspace ID'),
      workspaceName: z.string().nullable().describe('Workspace name'),
      rawCart: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Complete cart returned by Goody, including available product and item identifiers'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createGoodyClient(ctx);

    let o = await client.getOrder(ctx.input.orderId);

    let cartItems = (o.cart?.items || []).map((item: any) => ({
      productId: item.product?.id,
      productName: item.product?.name,
      brandName: item.product?.brand?.name,
      quantity: item.quantity,
      price: item.product?.price
    }));

    let shipments = (o.shipments || []).map((s: any) => ({
      carrier: s.tracking_carrier ?? s.carrier ?? null,
      trackingNumber: s.tracking_number ?? null,
      trackingUrl: s.tracking_url ?? null,
      status: s.status ?? null
    }));

    return {
      output: {
        orderId: o.id,
        status: o.status,
        referenceId: o.reference_id,
        giftLink: o.individual_gift_link,
        recipientFirstName: o.recipient_first_name,
        recipientLastName: o.recipient_last_name ?? null,
        recipientEmail: o.recipient_email ?? null,
        message: o.message ?? null,
        thankYouNote: o.thank_you_note ?? null,
        isSwapped: o.is_swapped,
        viewCountRecipient: o.view_count_recipient,
        orderBatchId: o.order_batch_id,
        cartItems,
        shipments,
        amounts: {
          amountProduct: o.amounts?.amount_product,
          amountShipping: o.amounts?.amount_shipping,
          amountProcessingFee: o.amounts?.amount_processing_fee ?? null,
          amountPreTaxTotal: o.amounts?.amount_pre_tax_total,
          amountTax: o.amounts?.amount_tax ?? null,
          amountTotal: o.amounts?.amount_total ?? null
        },
        senderEmail: o.sender?.email ?? null,
        senderFirstName: o.sender?.first_name ?? null,
        senderLastName: o.sender?.last_name ?? null,
        eventTimes: {
          createdAt: o.event_times?.created_at ?? null,
          notifiedAt: o.event_times?.notified_at ?? null,
          openedAt: o.event_times?.opened_at ?? null,
          acceptedAt: o.event_times?.accepted_at ?? null,
          shippedAt: o.event_times?.shipped_at ?? null,
          deliveredAt: o.event_times?.delivered_at ?? null
        },
        expiresAt: o.expires_at ?? null,
        paymentLink: o.payment_link ?? null,
        workspaceId: o.workspace_id ?? null,
        workspaceName: o.workspace_name ?? null,
        rawCart: o.cart
      },
      message: `Order **${o.reference_id}** for **${o.recipient_first_name}${o.recipient_last_name ? ` ${o.recipient_last_name}` : ''}** — status: **${o.status}**.`
    };
  })
  .build();
