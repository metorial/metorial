import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let itemDetailSchema = z.object({
  quantity: z.number().min(1).describe('Number of gift cards to create from this item'),
  itemId: z
    .string()
    .optional()
    .describe(
      'Reference an existing item by ID (overrides other fields except quantity, value, price)'
    ),
  name: z.string().optional().describe('Gift card name (required if itemId not specified)'),
  description: z.string().optional().describe('Gift card description'),
  code: z.string().optional().describe('Custom gift card code (auto-generated if omitted)'),
  backingType: z
    .enum(['Currency', 'Units'])
    .optional()
    .describe('Backing type (required if itemId not specified)'),
  price: z.number().optional().describe('Price charged to the purchaser'),
  value: z.number().optional().describe('Currency value loaded onto the gift card'),
  units: z.number().optional().describe('Units loaded onto the gift card (for unit-backed)'),
  equivalentValuePerUnit: z.number().optional().describe('Currency value per unit'),
  expiresOn: z
    .string()
    .optional()
    .describe('Specific expiry date (ISO 8601). Set overrideExpiry to true.'),
  expiresInMonths: z
    .number()
    .optional()
    .describe('Months until expiry. Set overrideExpiry to true.'),
  expiresInDays: z
    .number()
    .optional()
    .describe('Days until expiry. Set overrideExpiry to true.'),
  overrideExpiry: z
    .boolean()
    .optional()
    .describe('Must be true to use custom expiry settings'),
  validFrom: z
    .string()
    .optional()
    .describe('Valid-from date (ISO 8601). Set overrideValidFrom to true.'),
  validFromInDays: z
    .number()
    .optional()
    .describe('Days from now until valid. Set overrideValidFrom to true.'),
  overrideValidFrom: z
    .boolean()
    .optional()
    .describe('Must be true to use custom valid-from settings'),
  sku: z.string().optional().describe('Private SKU reference'),
  terms: z.string().optional().describe('Specific terms and conditions')
});

let recipientSchema = z
  .object({
    recipientName: z.string().optional().describe('Recipient name'),
    recipientEmail: z
      .string()
      .optional()
      .describe('Recipient email (required for email fulfilment)'),
    message: z.string().optional().describe('Personal message'),
    scheduledFor: z
      .string()
      .optional()
      .describe('Schedule email delivery for a future date (ISO 8601, UTC)'),
    fulfilmentMethod: z
      .enum(['Email', 'Post', 'None'])
      .optional()
      .describe('How to deliver the gift card'),
    shippingAddress: z
      .object({
        address1: z.string().describe('Street address line 1'),
        address2: z.string().optional().describe('Street address line 2'),
        city: z.string().describe('City'),
        state: z.string().describe('State/province'),
        postalCode: z.string().describe('Postal/zip code'),
        countryCode: z.string().describe('Country code')
      })
      .optional()
      .describe('Shipping address (required for postal fulfilment)'),
    shippingOption: z
      .object({
        shippingOptionId: z
          .string()
          .optional()
          .describe('Reference an existing shipping option'),
        name: z.string().optional().describe('Shipping option name'),
        price: z.number().optional().describe('Shipping price')
      })
      .optional()
      .describe('Shipping option (required for postal fulfilment)')
  })
  .optional();

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order containing one or more gift cards. Supports recipient details with scheduled email delivery, custom fields, sales taxes, discounts, tips, and metadata.`,
  instructions: [
    'Each item in the items array creates gift cards. Use **itemId** to reference an existing item template, or provide **name**, **backingType**, **price**, and **value**/**units** for a custom item.',
    'Set **disableAllEmails** to true to suppress all Gift Up! notification emails.'
  ]
})
  .input(
    z.object({
      purchaserEmail: z.string().describe('Purchaser email address'),
      purchaserName: z.string().describe('Purchaser name'),
      items: z
        .array(itemDetailSchema)
        .min(1)
        .describe('Gift card items to include in the order'),
      recipient: recipientSchema.describe('Recipient details and delivery method'),
      orderDate: z.string().optional().describe('Order date (ISO 8601, defaults to now)'),
      disableAllEmails: z
        .boolean()
        .optional()
        .describe('Suppress all Gift Up! emails for this order'),
      tip: z.number().optional().describe('Tip amount'),
      serviceFee: z.number().optional().describe('Service fee amount'),
      discount: z.number().optional().describe('Discount amount'),
      revenue: z.number().optional().describe('Total revenue for the order'),
      referrer: z.string().optional().describe('Referral source identifier'),
      customFields: z
        .array(
          z.object({
            label: z.string().describe('Field label'),
            value: z.any().describe('Field value'),
            showOnGiftCard: z.boolean().optional().describe('Show on the gift card'),
            showOnRedeemApp: z.boolean().optional().describe('Show on the redeem app')
          })
        )
        .optional()
        .describe('Custom fields'),
      salesTaxes: z
        .array(
          z.object({
            label: z.string().describe('Tax label'),
            amount: z.number().describe('Tax amount'),
            type: z
              .enum(['inclusive', 'exclusive'])
              .describe('Whether tax is inclusive or exclusive')
          })
        )
        .optional()
        .describe('Sales taxes'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata (max 20 pairs)')
    })
  )
  .output(
    z
      .object({
        orderId: z.string().describe('Created order ID'),
        orderNumber: z.string().describe('Order number'),
        createdOn: z.string().describe('Creation date'),
        revenue: z.number().describe('Order revenue'),
        currency: z.string().describe('Currency code'),
        giftCards: z
          .array(
            z
              .object({
                code: z.string().describe('Gift card code'),
                title: z.string().nullable().describe('Gift card title'),
                canBeRedeemed: z.boolean().describe('Whether redeemable'),
                remainingValue: z.number().describe('Remaining balance'),
                initialValue: z.number().describe('Initial value')
              })
              .passthrough()
          )
          .describe('Created gift cards'),
        purchaserEmail: z.string().describe('Purchaser email'),
        purchaserName: z.string().describe('Purchaser name')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let itemDetails = ctx.input.items.map(item => {
      let mapped: any = { ...item };
      if (item.itemId) {
        mapped.id = item.itemId;
        mapped.itemId = undefined;
      }
      return mapped;
    });

    let recipientDetails: any;
    if (ctx.input.recipient) {
      recipientDetails = { ...ctx.input.recipient };
      if (recipientDetails.shippingOption?.shippingOptionId) {
        recipientDetails.shippingOption = {
          ...recipientDetails.shippingOption,
          id: recipientDetails.shippingOption.shippingOptionId
        };
        recipientDetails.shippingOption.shippingOptionId = undefined;
      }
    }

    let order = await client.createOrder({
      orderDate: ctx.input.orderDate,
      disableAllEmails: ctx.input.disableAllEmails,
      purchaserEmail: ctx.input.purchaserEmail,
      purchaserName: ctx.input.purchaserName,
      tip: ctx.input.tip,
      serviceFee: ctx.input.serviceFee,
      discount: ctx.input.discount,
      revenue: ctx.input.revenue,
      referrer: ctx.input.referrer,
      itemDetails,
      recipientDetails,
      customFields: ctx.input.customFields,
      salesTaxes: ctx.input.salesTaxes,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        ...order,
        orderId: order.id
      },
      message: `Created order **#${order.orderNumber}** with ${order.giftCards?.length ?? 0} gift card(s) for **${ctx.input.purchaserName}**`
    };
  })
  .build();
