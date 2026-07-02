import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

let productCodeSchema = z.object({
  type: z.enum(['upc', 'rrc']).describe('Product code type'),
  value: z.string().describe('Product code value')
});

let orderItemSchema = z.object({
  lineNum: z.string().describe('Unique line number identifier for this item'),
  count: z.number().describe('Quantity of the item'),
  weight: z.number().optional().describe('Weight of the item'),
  specialInstructions: z.string().optional().describe('Special instructions for this item'),
  replacementPolicy: z
    .enum(['no_replacements', 'shoppers_choice', 'users_choice'])
    .optional()
    .describe('What to do if this item is unavailable'),
  productCodes: z
    .array(productCodeSchema)
    .optional()
    .describe('Product identification codes (UPC or RRC)')
});

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a delivery or pickup order for a Connect user. Provide the store location, items, and fulfillment preferences. For delivery orders, you can specify address, tip, and delivery instructions. Orders are fulfilled by Instacart shoppers who pick items from the selected store.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  instructions: [
    'Use "Find Stores" to get a locationCode and "List Cart Service Options" to get a serviceOptionHoldId before creating an order.',
    'A serviceOptionHoldId from reserving a time slot is recommended for delivery orders.',
    'Cancellation is only possible before a shopper is assigned (before "acknowledged" status).'
  ],
  constraints: ['Delivery orders cannot be cancelled once a shopper is assigned.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fulfillmentType: z
        .enum(['delivery', 'pickup'])
        .describe('Whether this is a delivery or pickup order'),
      userId: z.string().describe('Connect user ID'),
      orderId: z.string().optional().describe('Your own order ID for tracking'),
      serviceOptionHoldId: z.number().optional().describe('Reserved time slot hold ID'),
      locationCode: z.string().describe('Store location code from Find Stores'),
      items: z.array(orderItemSchema).describe('Items to order'),
      initialTipCents: z
        .number()
        .optional()
        .describe('Initial tip amount in cents (delivery only)'),
      leaveUnattended: z.boolean().optional().describe('Leave order at door (delivery only)'),
      specialInstructions: z
        .string()
        .optional()
        .describe('Special delivery instructions (delivery only)'),
      loyaltyNumber: z.string().optional().describe('Customer loyalty card number'),
      locale: z.string().optional().describe('Order locale'),
      paidWithEbt: z.boolean().optional().describe('Whether paid with EBT (delivery only)'),
      address: z
        .object({
          addressLine1: z.string().describe('Primary address line'),
          addressLine2: z.string().optional().describe('Secondary address line'),
          addressType: z.string().optional().describe('Address type (e.g., "residential")'),
          postalCode: z.string().describe('Postal code'),
          city: z.string().optional().describe('City name')
        })
        .optional()
        .describe('Delivery address (delivery only)'),
      userDetails: z
        .object({
          birthday: z
            .string()
            .optional()
            .describe('Customer birthday (YYYY-MM-DD) for age-restricted items'),
          phoneNumber: z.string().optional().describe('Customer phone number'),
          smsOptIn: z
            .boolean()
            .optional()
            .describe('Whether customer opts in to SMS notifications')
        })
        .optional()
        .describe('Additional user details for this order')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Instacart order ID'),
      status: z.string().describe('Current order status'),
      orderUrl: z.string().optional().describe('URL to view the order'),
      createdAt: z.string().optional().describe('Order creation timestamp (ISO 8601)'),
      fulfillmentDetails: z
        .object({
          storeLocation: z
            .string()
            .optional()
            .describe('Store location where the order will be shopped'),
          windowStartsAt: z
            .string()
            .optional()
            .describe('Fulfillment window start (ISO 8601)'),
          windowEndsAt: z.string().optional().describe('Fulfillment window end (ISO 8601)')
        })
        .optional()
        .describe('Fulfillment details'),
      warnings: z
        .array(
          z.object({
            message: z.string().describe('Warning message')
          })
        )
        .optional()
        .describe('Any warnings about the order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let order: any;
    if (ctx.input.fulfillmentType === 'delivery') {
      order = await client.createDeliveryOrder({
        userId: ctx.input.userId,
        orderId: ctx.input.orderId,
        serviceOptionHoldId: ctx.input.serviceOptionHoldId,
        locationCode: ctx.input.locationCode,
        initialTipCents: ctx.input.initialTipCents,
        leaveUnattended: ctx.input.leaveUnattended,
        specialInstructions: ctx.input.specialInstructions,
        loyaltyNumber: ctx.input.loyaltyNumber,
        locale: ctx.input.locale,
        paidWithEbt: ctx.input.paidWithEbt,
        items: ctx.input.items,
        address: ctx.input.address,
        user: ctx.input.userDetails
      });
    } else {
      order = await client.createPickupOrder({
        userId: ctx.input.userId,
        orderId: ctx.input.orderId,
        serviceOptionHoldId: ctx.input.serviceOptionHoldId,
        locationCode: ctx.input.locationCode,
        loyaltyNumber: ctx.input.loyaltyNumber,
        locale: ctx.input.locale,
        items: ctx.input.items,
        user: ctx.input.userDetails
      });
    }

    return {
      output: {
        orderId: order.orderId,
        status: order.status,
        orderUrl: order.orderUrl,
        createdAt: order.createdAt,
        fulfillmentDetails: order.fulfillmentDetails
          ? {
              storeLocation: order.fulfillmentDetails.storeLocation,
              windowStartsAt: order.fulfillmentDetails.windowStartsAt,
              windowEndsAt: order.fulfillmentDetails.windowEndsAt
            }
          : undefined,
        warnings: order.warnings
      },
      message: `**${ctx.input.fulfillmentType.charAt(0).toUpperCase() + ctx.input.fulfillmentType.slice(1)}** order created with **${ctx.input.items.length}** item(s).\n\n- Order ID: \`${order.orderId}\`\n- Status: **${order.status}**${order.orderUrl ? `\n- [View Order](${order.orderUrl})` : ''}`
    };
  })
  .build();
