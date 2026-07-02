import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCoupon = SlateTool.create(spec, {
  name: 'Update Coupon',
  key: 'update_coupon',
  description: `Update an existing coupon in your Zylvie store. Only include the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      couponId: z.string().describe('ID of the coupon to update'),

      code: z.string().optional().describe('New coupon code'),
      type: z.enum(['percentage', 'fixed']).optional().describe('New discount type'),
      amount: z.number().optional().describe('New discount value'),

      isStorewide: z
        .boolean()
        .optional()
        .describe('Whether the coupon applies to all products'),
      products: z.array(z.string()).optional().describe('Product IDs this coupon applies to'),
      isLive: z.boolean().optional().describe('Whether the coupon is active'),
      limit: z.number().optional().describe('Maximum number of redemptions'),
      durationInMonths: z
        .number()
        .optional()
        .describe('For subscriptions: how many months the discount applies'),
      start: z.string().optional().describe('Start date in ISO 8601 format'),
      end: z.string().optional().describe('Expiration date in ISO 8601 format'),
      affiliateId: z.string().optional().describe('Affiliate ID to associate'),
      requiresSubscriptionProduct: z
        .string()
        .optional()
        .describe('Product ID for subscriber-only restriction')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('ID of the updated coupon'),
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
      id: ctx.input.couponId
    };

    if (ctx.input.code !== undefined) data.code = ctx.input.code;
    if (ctx.input.type !== undefined) data.type = ctx.input.type;
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
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

    let result = await client.updateCoupon(data);

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
      message: `Updated coupon **${result.code}** (ID: \`${result.id}\`).`
    };
  })
  .build();
