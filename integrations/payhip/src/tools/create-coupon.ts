import { SlateTool } from 'slates';
import { z } from 'zod';
import { CouponClient } from '../lib/client';
import { spec } from '../spec';

export let createCoupon = SlateTool.create(spec, {
  name: 'Create Coupon',
  key: 'create_coupon',
  description: `Creates a discount coupon for your Payhip store. Supports percentage-based or fixed-amount discounts.
Coupons can be scoped to a single product, a collection of products, or all products in your store.
Optionally configure start/end dates, minimum purchase amount, usage limits, and internal notes.`,
  instructions: [
    'Provide either **percentOff** (0-100) or **amountOff** (in cents), not both.',
    'If couponType is "single", you must provide a **productKey**.',
    'If couponType is "collection", you must provide a **collectionId**.',
    'If couponType is "multi", the coupon applies to all products.'
  ],
  constraints: [
    'Coupons for subscription-priced products with recurring amounts are not supported via the API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      code: z.string().describe('Coupon code that customers will enter at checkout'),
      couponType: z
        .enum(['single', 'multi', 'collection'])
        .describe(
          '"single" for one product, "multi" for all products, "collection" for a product collection'
        ),
      percentOff: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Percentage discount (0-100). Mutually exclusive with amountOff.'),
      amountOff: z
        .number()
        .optional()
        .describe('Fixed discount amount in cents. Mutually exclusive with percentOff.'),
      productKey: z
        .string()
        .optional()
        .describe('Unique product key, required when couponType is "single"'),
      collectionId: z
        .string()
        .optional()
        .describe('Unique collection ID, required when couponType is "collection"'),
      startDate: z.string().optional().describe('Start date for the coupon validity period'),
      endDate: z.string().optional().describe('End date for the coupon validity period'),
      minimumPurchaseAmount: z
        .number()
        .optional()
        .describe('Minimum purchase amount in cents required to use this coupon'),
      usageLimit: z
        .number()
        .optional()
        .describe('Maximum number of times this coupon can be redeemed'),
      notes: z
        .string()
        .optional()
        .describe('Internal notes about the coupon (not visible to customers)')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('Unique identifier of the created coupon'),
      code: z.string().describe('Coupon code'),
      couponType: z.string().describe('Type of coupon: single, multi, or collection'),
      percentOff: z.number().nullable().describe('Percentage discount if applicable'),
      amountOff: z
        .number()
        .nullable()
        .describe('Fixed discount amount in cents if applicable'),
      productKey: z
        .string()
        .nullable()
        .describe('Product key if coupon is scoped to a single product'),
      collectionId: z
        .string()
        .nullable()
        .describe('Collection ID if coupon is scoped to a collection'),
      startDate: z.string().nullable().describe('Coupon validity start date'),
      endDate: z.string().nullable().describe('Coupon validity end date'),
      minimumPurchaseAmount: z
        .number()
        .nullable()
        .describe('Minimum purchase amount required'),
      usageLimit: z.number().nullable().describe('Maximum redemption count'),
      notes: z.string().nullable().describe('Internal notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CouponClient({ apiKey: ctx.auth.token });

    let coupon = await client.createCoupon({
      code: ctx.input.code,
      couponType: ctx.input.couponType,
      percentOff: ctx.input.percentOff,
      amountOff: ctx.input.amountOff,
      productKey: ctx.input.productKey,
      collectionId: ctx.input.collectionId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      minimumPurchaseAmount: ctx.input.minimumPurchaseAmount,
      usageLimit: ctx.input.usageLimit,
      notes: ctx.input.notes
    });

    let discountDesc = coupon.percentOff
      ? `${coupon.percentOff}% off`
      : `${(coupon.amountOff ?? 0) / 100} off (fixed)`;

    return {
      output: coupon,
      message: `Created coupon **${coupon.code}** (${discountDesc}) with type "${coupon.couponType}".`
    };
  })
  .build();
