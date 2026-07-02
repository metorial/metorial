import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  firstName: z.string().describe('Recipient first name, as it should appear on the envelope'),
  lastName: z.string().describe('Recipient last name, as it should appear on the envelope'),
  company: z
    .string()
    .optional()
    .describe('Recipient company name, appears below their name on the envelope'),
  address: z.string().describe('Street number, name and type'),
  address2: z.string().optional().describe('Unit, floor, apartment, etc.'),
  city: z.string().describe('City or suburb'),
  region: z.string().optional().describe('State, province, or region'),
  country: z.string().describe('2-character ISO country code (e.g. AU, US, GB, CA)'),
  postcode: z.string().optional().describe('Postal/ZIP code')
});

let senderSchema = z.object({
  firstName: z.string().describe('Sender first name'),
  lastName: z.string().describe('Sender last name'),
  company: z.string().optional().describe('Sender company name'),
  address: z.string().optional().describe('Sender street address'),
  address2: z.string().optional().describe('Sender address line 2'),
  city: z.string().optional().describe('Sender city'),
  region: z.string().optional().describe('Sender state/province/region'),
  country: z.string().optional().describe('Sender 2-character ISO country code'),
  postcode: z.string().optional().describe('Sender postal/ZIP code')
});

let lineItemSchema = z.object({
  artworkId: z.string().describe('UUID of the artwork to use for this card'),
  templateId: z.string().describe('UUID of the message template to use'),
  recipient: recipientSchema.describe('Recipient details for this card'),
  sender: senderSchema.optional().describe('Sender/return address details'),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .describe('Template variable substitutions, e.g. { "firstName": "John" }'),
  shipToMe: z
    .boolean()
    .optional()
    .describe(
      'Send the card to the sender with a blank envelope instead of mailing to recipient'
    ),
  shippingMethod: z
    .string()
    .optional()
    .describe('Shipping method: standard, tracked, or express (availability varies by region)')
});

export let placeOrder = SlateTool.create(spec, {
  name: 'Place Order',
  key: 'place_order',
  description: `Place an order to send one or more personalized handwritten cards, postcards, or letters. Each line item specifies artwork, a message template, and recipient details. Cards will be printed and mailed to the recipients.

Supports variable substitution in templates, custom sender/return addresses, shipping method selection, and idempotent requests to prevent duplicate orders.`,
  instructions: [
    'Ensure artwork and template IDs exist before placing an order. Use the list tools to discover available options.',
    'Use the idempotencyKey to safely retry failed requests without placing duplicate orders.',
    'Country must be a 2-character ISO code (e.g. AU, US, GB, CA).'
  ],
  constraints: [
    'Requires sufficient prepaid credit on the account.',
    'Delivery to 50+ countries from US, UK, Canada, and Australia production facilities.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      lines: z
        .array(lineItemSchema)
        .min(1)
        .describe('One or more card line items to include in this order'),
      requestedArrivalDate: z
        .string()
        .optional()
        .describe('Preferred arrival date in ISO 8601 format'),
      purchaseOrderNumber: z
        .string()
        .optional()
        .describe('Purchase order number for auditing purposes'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key (e.g. UUID v4) to ensure idempotent order placement')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique ID of the placed order'),
      status: z.string().describe('Current order status'),
      purchaseOrderNumber: z.string().optional().describe('Attached purchase order number'),
      lines: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Order line items with details'),
      cost: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Cost breakdown for the order'),
      createdAt: z.string().describe('Timestamp when the order was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.placeOrder({
      lines: ctx.input.lines.map(line => ({
        artwork: line.artworkId,
        template: line.templateId,
        recipient: line.recipient,
        sender: line.sender,
        variables: line.variables,
        shipToMe: line.shipToMe,
        shippingMethod: line.shippingMethod
      })),
      requestedArrivalDate: ctx.input.requestedArrivalDate,
      purchaseOrderNumber: ctx.input.purchaseOrderNumber,
      idempotencyKey: ctx.input.idempotencyKey
    });

    let lineCount = ctx.input.lines.length;

    return {
      output: {
        orderId: result.id,
        status: result.status,
        purchaseOrderNumber: result.purchaseOrderNumber,
        lines: result.lines,
        cost: result.cost,
        createdAt: result.createdAt
      },
      message: `Order **${result.id}** placed successfully with **${lineCount}** card(s). Status: **${result.status}**.`
    };
  })
  .build();
