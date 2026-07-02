import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoodyClient } from '../lib/client';
import { spec } from '../spec';

let recipientInputSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  email: z
    .string()
    .optional()
    .describe('Recipient email address (required for email_and_link send method)'),
  phone: z
    .string()
    .optional()
    .describe('Recipient phone number in E.164 format (e.g. +15552347890), US only')
});

let cartItemSchema = z.object({
  productId: z.string().optional().describe('Product ID (preferred over productUrl)'),
  productUrl: z.string().optional().describe('Product URL (alternative to productId)'),
  quantity: z.number().describe('Quantity of the product'),
  variablePrice: z.number().optional().describe('Price in cents for flex gifts or gift cards'),
  variants: z
    .array(z.string())
    .optional()
    .describe('Array of variant names for direct_send orders')
});

let orderPreviewSchema = z.object({
  orderId: z.string().describe('Unique order identifier'),
  status: z.string().describe('Order status'),
  giftLink: z.string().describe('Gift link URL for the recipient'),
  recipientFirstName: z.string().describe('Recipient first name'),
  recipientLastName: z.string().nullable().describe('Recipient last name'),
  recipientEmail: z.string().nullable().describe('Recipient email')
});

export let sendGift = SlateTool.create(spec, {
  name: 'Send Gift',
  key: 'send_gift',
  description: `Create a gift order batch to send products to one or more recipients. Generates gift links that recipients use to accept gifts, choose options, and enter their address. Supports email/SMS notifications or link-only delivery.`,
  instructions: [
    'Use "email_and_link" send method to have Goody send email/SMS notifications to recipients. Requires email for each recipient.',
    'Use "link_multiple_custom_list" to get gift links without Goody sending notifications — you deliver the links yourself.',
    'Use scheduledSendOn (ISO 8601) to schedule gifts for future delivery.',
    'Set swap to "disabled" to prevent recipients from swapping the gift for another product.'
  ],
  constraints: [
    'The "direct_send" method requires approved partner access.',
    'Batches with more than 10 recipients are processed asynchronously.'
  ]
})
  .input(
    z.object({
      fromName: z.string().describe('Sender name displayed on the gift'),
      sendMethod: z
        .enum(['email_and_link', 'link_multiple_custom_list'])
        .describe('How the gift is delivered to recipients'),
      recipients: z.array(recipientInputSchema).min(1).describe('List of gift recipients'),
      cart: z.array(cartItemSchema).min(1).describe('Products to include in the gift'),
      message: z
        .string()
        .optional()
        .describe('Gift message displayed in the digital unwrapping experience'),
      cardId: z.string().optional().describe('ID of a greeting card to attach'),
      paymentMethodId: z
        .string()
        .optional()
        .describe('Payment method ID (defaults to first on account)'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (defaults to oldest accessible)'),
      scheduledSendOn: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to schedule the gift for future delivery'),
      expiresAt: z.string().optional().describe('ISO 8601 timestamp for gift expiration'),
      swap: z
        .enum(['single', 'multiple', 'disabled'])
        .optional()
        .describe(
          'Gift swap behavior: single (one swap), multiple (multiple swaps), disabled (no swapping)'
        )
    })
  )
  .output(
    z.object({
      orderBatchId: z.string().describe('ID of the created order batch'),
      sendStatus: z
        .string()
        .describe('Batch processing status: pending, complete, failed, or canceled'),
      ordersCount: z.number().describe('Total number of orders in the batch'),
      isScheduledSend: z
        .boolean()
        .describe('Whether the batch is scheduled for future delivery'),
      orders: z.array(orderPreviewSchema).describe('Preview of orders (first 10)'),
      referenceId: z.string().describe('Display reference ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoodyClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createOrderBatch({
      from_name: ctx.input.fromName,
      send_method: ctx.input.sendMethod,
      recipients: ctx.input.recipients.map(r => ({
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email,
        phone: r.phone
      })),
      cart: {
        items: ctx.input.cart.map(item => ({
          product_id: item.productId,
          product_url: item.productUrl,
          quantity: item.quantity,
          variable_price: item.variablePrice,
          variants: item.variants
        }))
      },
      message: ctx.input.message,
      card_id: ctx.input.cardId,
      payment_method_id: ctx.input.paymentMethodId,
      workspace_id: ctx.input.workspaceId,
      scheduled_send_on: ctx.input.scheduledSendOn,
      expires_at: ctx.input.expiresAt,
      swap: ctx.input.swap
    });

    let orders = (result.orders_preview || []).map((o: any) => ({
      orderId: o.id,
      status: o.status,
      giftLink: o.individual_gift_link,
      recipientFirstName: o.recipient_first_name,
      recipientLastName: o.recipient_last_name,
      recipientEmail: o.recipient_email
    }));

    return {
      output: {
        orderBatchId: result.id,
        sendStatus: result.send_status,
        ordersCount: result.orders_count,
        isScheduledSend: result.is_scheduled_send,
        orders,
        referenceId: result.reference_id
      },
      message: `Gift batch **${result.reference_id}** created with **${result.orders_count}** order(s). Status: **${result.send_status}**.`
    };
  })
  .build();
