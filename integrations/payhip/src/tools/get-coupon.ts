import { SlateTool } from 'slates';
import { z } from 'zod';
import { CouponClient } from '../lib/client';
import { spec } from '../spec';

export let getCoupon = SlateTool.create(spec, {
  name: 'Get Coupon',
  key: 'get_coupon',
  description: `Retrieves the details of a specific coupon by its ID, including discount type, scope, validity dates, and usage limits.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      couponId: z.string().describe('Unique identifier of the coupon to retrieve')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('Unique identifier of the coupon'),
      code: z.string().describe('Coupon code'),
      couponType: z.string().describe('Type of coupon: single, multi, or collection'),
      percentOff: z.number().nullable().describe('Percentage discount if applicable'),
      amountOff: z
        .number()
        .nullable()
        .describe('Fixed discount amount in cents if applicable'),
      productKey: z.string().nullable().describe('Product key if scoped to a single product'),
      collectionId: z.string().nullable().describe('Collection ID if scoped to a collection'),
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

    let coupon = await client.getCoupon(ctx.input.couponId);

    let discountDesc = coupon.percentOff
      ? `${coupon.percentOff}% off`
      : `${(coupon.amountOff ?? 0) / 100} off (fixed)`;

    return {
      output: coupon,
      message: `Coupon **${coupon.code}** — ${discountDesc}, type: "${coupon.couponType}".`
    };
  })
  .build();
