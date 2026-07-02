import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDiscountTool = SlateTool.create(spec, {
  name: 'Create Discount',
  key: 'create_discount',
  description: `Create a new discount code for your store. Supports percentage or fixed-amount discounts with optional product/variant restrictions, redemption limits, and date ranges.`,
  instructions: [
    'Discount codes must be 3-256 characters, uppercase letters and numbers only.',
    'For percentage discounts, the amount is a percentage (e.g., 10 for 10% off). For fixed discounts, the amount is in cents (e.g., 500 for $5.00 off).'
  ]
})
  .input(
    z.object({
      storeId: z
        .string()
        .optional()
        .describe('Store ID. Falls back to the configured store ID if not provided.'),
      name: z.string().describe('Name of the discount'),
      code: z.string().describe('Discount code (3-256 chars, uppercase letters/numbers only)'),
      amount: z
        .number()
        .describe('Discount amount (percentage or cents depending on amountType)'),
      amountType: z
        .enum(['percent', 'fixed'])
        .describe('Whether the amount is a percentage or fixed value in cents'),
      variantIds: z
        .array(z.string())
        .optional()
        .describe('Restrict discount to specific variant IDs'),
      maxRedemptions: z
        .number()
        .optional()
        .describe('Maximum number of times this discount can be redeemed'),
      startsAt: z
        .string()
        .optional()
        .describe('ISO 8601 date when the discount becomes active'),
      expiresAt: z.string().optional().describe('ISO 8601 date when the discount expires'),
      duration: z
        .enum(['once', 'repeating', 'forever'])
        .optional()
        .describe('How long the discount applies to subscriptions'),
      durationInMonths: z
        .number()
        .optional()
        .describe('Number of months for "repeating" duration'),
      testMode: z.boolean().optional().describe('Create discount in test mode')
    })
  )
  .output(
    z.object({
      discountId: z.string(),
      name: z.string(),
      code: z.string(),
      amount: z.number(),
      amountType: z.string(),
      status: z.string(),
      statusFormatted: z.string(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let storeId = ctx.input.storeId || ctx.config.storeId;

    if (!storeId) {
      throw new Error(
        'Store ID is required. Provide it in the input or configure it in the provider settings.'
      );
    }

    let response = await client.createDiscount(
      storeId,
      {
        name: ctx.input.name,
        code: ctx.input.code,
        amount: ctx.input.amount,
        amountType: ctx.input.amountType,
        isLimitedToProducts:
          ctx.input.variantIds && ctx.input.variantIds.length > 0 ? true : undefined,
        isLimitedRedemptions: ctx.input.maxRedemptions ? true : undefined,
        maxRedemptions: ctx.input.maxRedemptions,
        startsAt: ctx.input.startsAt,
        expiresAt: ctx.input.expiresAt,
        duration: ctx.input.duration,
        durationInMonths: ctx.input.durationInMonths,
        testMode: ctx.input.testMode
      },
      ctx.input.variantIds
    );

    let discount = response.data;
    let attrs = discount.attributes;

    return {
      output: {
        discountId: discount.id,
        name: attrs.name,
        code: attrs.code,
        amount: attrs.amount,
        amountType: attrs.amount_type,
        status: attrs.status,
        statusFormatted: attrs.status_formatted,
        createdAt: attrs.created_at
      },
      message: `Created discount **${attrs.code}** — ${attrs.amount_type === 'percent' ? `${attrs.amount}%` : `${attrs.amount} cents`} off.`
    };
  })
  .build();
