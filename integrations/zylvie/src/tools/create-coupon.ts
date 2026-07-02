import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCoupon = SlateTool.create(spec, {
  name: 'Create Coupon',
  key: 'create_coupon',
  description: `Create a discount coupon in your Zylvie store. Supports both percentage and fixed-amount discounts. Coupons can be storewide or restricted to specific products, with optional usage limits, date ranges, and subscription duration limits.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      code: z
        .string()
        .describe('Coupon code (must be unique, at least 2 characters, case-insensitive)'),
      type: z.enum(['percentage', 'fixed']).describe('Discount type'),
      amount: z
        .number()
        .describe('Discount value (0.1-100 for percentage, 0.1-999999.99 for fixed)'),

      isStorewide: z
        .boolean()
        .optional()
        .describe('Whether the coupon applies to all products (defaults to true)'),
      products: z
        .array(z.string())
        .optional()
        .describe('Product IDs this coupon applies to (required if isStorewide is false)'),
      isLive: z
        .boolean()
        .optional()
        .describe('Whether the coupon is active (defaults to false)'),
      limit: z.number().optional().describe('Maximum number of redemptions'),
      durationInMonths: z
        .number()
        .optional()
        .describe('For subscriptions: how many months the discount applies'),
      start: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format (e.g. "2024-12-31T23:59:59Z")'),
      end: z
        .string()
        .optional()
        .describe('Expiration date in ISO 8601 format (must be after start)'),
      affiliateId: z
        .string()
        .optional()
        .describe('Affiliate ID to associate with this coupon'),
      requiresSubscriptionProduct: z
        .string()
        .optional()
        .describe('Product ID - coupon can only be used by active subscribers of this product')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('ID of the created coupon'),
      code: z.string().describe('Coupon code'),
      type: z.string().describe('Discount type'),
      amount: z.number().describe('Discount amount'),
      isStorewide: z.boolean().describe('Whether storewide'),
      isLive: z.boolean().describe('Whether active'),
      redemptionCount: z.number().describe('Number of times used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      code: ctx.input.code,
      type: ctx.input.type,
      amount: ctx.input.amount
    };

    if (ctx.input.isStorewide !== undefined) data.is_storewide = ctx.input.isStorewide;
    if (ctx.input.products !== undefined) data.products = ctx.input.products;
    if (ctx.input.isLive !== undefined) data.is_live = ctx.input.isLive;
    if (ctx.input.limit !== undefined) data.limit = ctx.input.limit;
    if (ctx.input.durationInMonths !== undefined)
      data.duration_in_months = ctx.input.durationInMonths;
    if (ctx.input.start !== undefined) data.start = ctx.input.start;
    if (ctx.input.end !== undefined) data.end = ctx.input.end;
    if (ctx.input.affiliateId !== undefined) data.affiliate = ctx.input.affiliateId;
    if (ctx.input.requiresSubscriptionProduct !== undefined)
      data.requires_subscription_product = ctx.input.requiresSubscriptionProduct;

    let result = await client.createCoupon(data);

    return {
      output: {
        couponId: result.id as string,
        code: result.code as string,
        type: result.type as string,
        amount: result.amount as number,
        isStorewide: result.is_storewide as boolean,
        isLive: result.is_live as boolean,
        redemptionCount: result.redemption_count as number
      },
      message: `Created coupon **${result.code}** (ID: \`${result.id}\`) for ${ctx.input.amount}${ctx.input.type === 'percentage' ? '%' : ` ${ctx.input.type}`} off.`
    };
  })
  .build();
