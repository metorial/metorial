import { SlateTool } from 'slates';
import { z } from 'zod';
import { CouponClient } from '../lib/client';
import { spec } from '../spec';

export let listCoupons = SlateTool.create(spec, {
  name: 'List Coupons',
  key: 'list_coupons',
  description: `Retrieves a paginated list of coupons from your Payhip store. Use limit and offset to page through results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of coupons to return (1-100, default: 10)'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Number of coupons to skip for pagination (default: 0)')
    })
  )
  .output(
    z.object({
      coupons: z
        .array(
          z.object({
            couponId: z.string().describe('Unique identifier of the coupon'),
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
              .describe('Product key if scoped to a single product'),
            collectionId: z
              .string()
              .nullable()
              .describe('Collection ID if scoped to a collection'),
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
        .describe('List of coupons'),
      total: z.number().describe('Total number of coupons available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CouponClient({ apiKey: ctx.auth.token });

    let result = await client.listCoupons({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: result,
      message: `Found **${result.coupons.length}** coupons (total: ${result.total}).`
    };
  })
  .build();
