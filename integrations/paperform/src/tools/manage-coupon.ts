import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let couponOutputSchema = z.object({
  code: z.string().describe('Coupon code'),
  enabled: z.boolean().describe('Whether the coupon is active'),
  target: z.string().describe('Discount target: "price" or "subscription"'),
  discountAmount: z.number().describe('Fixed discount amount'),
  discountPercentage: z.number().describe('Percentage discount (0-100)'),
  expiresAt: z.string().nullable().describe('Expiration date-time or null if no expiry')
});

export let listCoupons = SlateTool.create(spec, {
  name: 'List Coupons',
  key: 'list_coupons',
  description: `List all discount coupons on a Paperform form. Returns coupon codes, discount details, and status. Stripe coupons are not included.`,
  constraints: ['Stripe coupons cannot be managed through this endpoint.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 20)'),
      skip: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      coupons: z.array(couponOutputSchema),
      total: z.number().describe('Total number of coupons'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCoupons(ctx.input.formSlugOrId, {
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    return {
      output: {
        coupons: result.results,
        total: result.total,
        hasMore: result.has_more
      },
      message: `Found **${result.total}** coupon(s). Returned **${result.results.length}** result(s).`
    };
  })
  .build();

export let createCoupon = SlateTool.create(spec, {
  name: 'Create Coupon',
  key: 'create_coupon',
  description: `Create a new discount coupon on a Paperform form. Set either a fixed discount amount or a percentage discount (0-100). Maximum 200 coupons per form.`,
  constraints: [
    'Maximum 200 coupons per form.',
    'Stripe coupons cannot be managed through this endpoint.'
  ]
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      code: z.string().describe('Coupon code'),
      enabled: z.boolean().optional().describe('Whether the coupon is active (default true)'),
      target: z.enum(['price', 'subscription']).optional().describe('Discount target'),
      discountAmount: z.number().optional().describe('Fixed discount amount'),
      discountPercentage: z.number().optional().describe('Percentage discount (0-100)'),
      expiresAt: z
        .string()
        .nullable()
        .optional()
        .describe('Expiration date-time in UTC, or null for no expiry')
    })
  )
  .output(couponOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.createCoupon(ctx.input.formSlugOrId, {
      code: ctx.input.code,
      enabled: ctx.input.enabled,
      target: ctx.input.target,
      discountAmount: ctx.input.discountAmount,
      discountPercentage: ctx.input.discountPercentage,
      expiresAt: ctx.input.expiresAt
    });

    return {
      output: c,
      message: `Created coupon **${c.code}** with ${c.discountPercentage > 0 ? `${c.discountPercentage}% off` : `$${c.discountAmount} off`}.`
    };
  })
  .build();

export let updateCoupon = SlateTool.create(spec, {
  name: 'Update Coupon',
  key: 'update_coupon',
  description: `Update an existing coupon on a Paperform form. Modify its enabled status, discount amount/percentage, target, or expiration. Provide only the fields you want to change.`
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      code: z.string().describe('Coupon code to update'),
      enabled: z.boolean().optional().describe('Whether the coupon is active'),
      target: z.enum(['price', 'subscription']).optional().describe('Discount target'),
      discountAmount: z.number().optional().describe('Fixed discount amount'),
      discountPercentage: z.number().optional().describe('Percentage discount (0-100)'),
      expiresAt: z
        .string()
        .nullable()
        .optional()
        .describe('Expiration date-time in UTC, or null for no expiry')
    })
  )
  .output(couponOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let c = await client.updateCoupon(ctx.input.formSlugOrId, ctx.input.code, {
      enabled: ctx.input.enabled,
      target: ctx.input.target,
      discountAmount: ctx.input.discountAmount,
      discountPercentage: ctx.input.discountPercentage,
      expiresAt: ctx.input.expiresAt
    });

    return {
      output: c,
      message: `Updated coupon **${c.code}**.`
    };
  })
  .build();

export let deleteCoupon = SlateTool.create(spec, {
  name: 'Delete Coupon',
  key: 'delete_coupon',
  description: `Delete a coupon from a Paperform form by its code. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      code: z.string().describe('Coupon code to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteCoupon(ctx.input.formSlugOrId, ctx.input.code);

    return {
      output: { deleted: true },
      message: `Deleted coupon **${ctx.input.code}**.`
    };
  })
  .build();
