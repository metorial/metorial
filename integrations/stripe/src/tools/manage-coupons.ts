import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCoupons = SlateTool.create(spec, {
  name: 'Manage Coupons',
  key: 'manage_coupons',
  description: `Create, retrieve, update, delete, or list coupons; create, retrieve, update, or list promotion codes. Promotion codes can be deactivated with update and active=false. Coupons define discount rules (percentage or fixed amount), and promotion codes are customer-facing codes that apply coupons.`,
  instructions: [
    'Provide either percentOff or amountOff (with currency), not both.',
    'Use duration to control how long the discount applies: once, repeating (with durationInMonths), or forever.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resource: z.enum(['coupon', 'promotion_code']).describe('Resource type'),
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      couponId: z.string().optional().describe('Coupon ID'),
      promotionCodeId: z.string().optional().describe('Promotion code ID'),
      // Coupon fields
      percentOff: z.number().optional().describe('Percentage discount (0-100)'),
      amountOff: z
        .number()
        .optional()
        .describe('Fixed amount discount in smallest currency unit'),
      currency: z.string().optional().describe('Currency for amountOff'),
      duration: z
        .enum(['once', 'repeating', 'forever'])
        .optional()
        .describe('How long the discount lasts'),
      durationInMonths: z
        .number()
        .optional()
        .describe('Number of months (for repeating duration)'),
      maxRedemptions: z
        .number()
        .optional()
        .describe('Max number of times the coupon can be redeemed'),
      name: z.string().optional().describe('Coupon display name'),
      // Promotion code fields
      code: z.string().optional().describe('Customer-facing promotion code string'),
      active: z
        .boolean()
        .optional()
        .describe(
          'Whether the promotion code is active (create/update only for promotion_code)'
        ),
      metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      couponId: z.string().optional().describe('Coupon ID'),
      percentOff: z.number().optional().nullable().describe('Percentage discount'),
      amountOff: z.number().optional().nullable().describe('Fixed amount discount'),
      currency: z.string().optional().nullable().describe('Currency'),
      duration: z.string().optional().describe('Duration type'),
      name: z.string().optional().nullable().describe('Coupon name'),
      valid: z.boolean().optional().describe('Whether the coupon is still valid'),
      deleted: z.boolean().optional().describe('Whether it was deleted'),
      promotionCodeId: z.string().optional().describe('Promotion code ID'),
      code: z.string().optional().describe('Promotion code string'),
      promotionActive: z.boolean().optional().describe('Whether the promotion code is active'),
      coupons: z
        .array(
          z.object({
            couponId: z.string(),
            name: z.string().nullable(),
            percentOff: z.number().nullable(),
            amountOff: z.number().nullable(),
            duration: z.string(),
            valid: z.boolean()
          })
        )
        .optional()
        .describe('List of coupons'),
      promotionCodes: z
        .array(
          z.object({
            promotionCodeId: z.string(),
            code: z.string(),
            couponId: z.string(),
            active: z.boolean()
          })
        )
        .optional()
        .describe('List of promotion codes'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { resource, action } = ctx.input;

    if (resource === 'coupon') {
      if (action === 'create') {
        if ((ctx.input.percentOff !== undefined) === (ctx.input.amountOff !== undefined))
          throw stripeServiceError('Provide exactly one of percentOff or amountOff.');
        if (ctx.input.amountOff !== undefined && !ctx.input.currency)
          throw stripeServiceError('currency is required with amountOff.');
        if (ctx.input.duration === 'repeating' && ctx.input.durationInMonths === undefined)
          throw stripeServiceError('durationInMonths is required for repeating coupons.');
        let params: Record<string, any> = {};
        if (ctx.input.percentOff !== undefined) params.percent_off = ctx.input.percentOff;
        if (ctx.input.amountOff !== undefined) params.amount_off = ctx.input.amountOff;
        if (ctx.input.currency) params.currency = ctx.input.currency;
        if (ctx.input.duration) params.duration = ctx.input.duration;
        if (ctx.input.durationInMonths !== undefined)
          params.duration_in_months = ctx.input.durationInMonths;
        if (ctx.input.maxRedemptions !== undefined)
          params.max_redemptions = ctx.input.maxRedemptions;
        if (ctx.input.name) params.name = ctx.input.name;
        if (ctx.input.couponId) params.id = ctx.input.couponId;
        if (ctx.input.metadata) params.metadata = ctx.input.metadata;

        let coupon = await client.createCoupon(params);
        return {
          output: {
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
            name: coupon.name,
            valid: coupon.valid
          },
          message: `Created coupon **${coupon.name || coupon.id}**: ${coupon.percent_off ? `${coupon.percent_off}% off` : `${coupon.amount_off} ${coupon.currency?.toUpperCase()} off`}`
        };
      }

      if (action === 'get') {
        if (!ctx.input.couponId)
          throw stripeServiceError('couponId is required for get action');
        let coupon = await client.getCoupon(ctx.input.couponId);
        return {
          output: {
            couponId: coupon.id,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
            name: coupon.name,
            valid: coupon.valid
          },
          message: `Coupon **${coupon.name || coupon.id}**: ${coupon.valid ? 'valid' : 'invalid'}`
        };
      }

      if (action === 'update') {
        if (!ctx.input.couponId)
          throw stripeServiceError('couponId is required for update action');
        let params: Record<string, any> = {};
        if (ctx.input.name) params.name = ctx.input.name;
        if (ctx.input.metadata) params.metadata = ctx.input.metadata;

        let coupon = await client.updateCoupon(ctx.input.couponId, params);
        return {
          output: {
            couponId: coupon.id,
            name: coupon.name,
            valid: coupon.valid
          },
          message: `Updated coupon **${coupon.name || coupon.id}**`
        };
      }

      if (action === 'delete') {
        if (!ctx.input.couponId)
          throw stripeServiceError('couponId is required for delete action');
        let result = await client.deleteCoupon(ctx.input.couponId);
        return {
          output: { couponId: result.id, deleted: result.deleted },
          message: `Deleted coupon **${ctx.input.couponId}**`
        };
      }

      // list
      let params: Record<string, any> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;

      let result = await client.listCoupons(params);
      return {
        output: {
          coupons: result.data.map((c: any) => ({
            couponId: c.id,
            name: c.name,
            percentOff: c.percent_off,
            amountOff: c.amount_off,
            duration: c.duration,
            valid: c.valid
          })),
          hasMore: result.has_more
        },
        message: `Found **${result.data.length}** coupon(s)`
      };
    }

    // Promotion codes
    if (action === 'create') {
      if (!ctx.input.couponId)
        throw stripeServiceError('couponId is required for promotion code creation');
      let params: Record<string, any> = {
        promotion: { type: 'coupon', coupon: ctx.input.couponId }
      };
      if (ctx.input.code) params.code = ctx.input.code;
      if (ctx.input.active !== undefined) params.active = ctx.input.active;
      if (ctx.input.maxRedemptions !== undefined)
        params.max_redemptions = ctx.input.maxRedemptions;
      if (ctx.input.metadata) params.metadata = ctx.input.metadata;

      let promo = await client.createPromotionCode(params);
      return {
        output: {
          promotionCodeId: promo.id,
          code: promo.code,
          couponId:
            promo.promotion?.coupon?.id ||
            promo.promotion?.coupon ||
            promo.coupon?.id ||
            promo.coupon,
          promotionActive: promo.active
        },
        message: `Created promotion code **${promo.code}** (${promo.id})`
      };
    }

    if (action === 'delete') {
      throw stripeServiceError(
        'Stripe promotion codes cannot be deleted. Use update with active=false.'
      );
    }
    if (action === 'get' || action === 'update') {
      if (!ctx.input.promotionCodeId)
        throw stripeServiceError('promotionCodeId is required for get/update.');
      let promo =
        action === 'get'
          ? await client.getPromotionCode(ctx.input.promotionCodeId)
          : await client.updatePromotionCode(ctx.input.promotionCodeId, {
              active: ctx.input.active,
              metadata: ctx.input.metadata
            });
      return {
        output: {
          promotionCodeId: promo.id,
          code: promo.code,
          couponId:
            promo.promotion?.coupon?.id ||
            promo.promotion?.coupon ||
            promo.coupon?.id ||
            promo.coupon,
          promotionActive: promo.active
        },
        message: `Promotion code **${promo.code}**: ${promo.active ? 'active' : 'inactive'}`
      };
    }

    // list
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.couponId) params.coupon = ctx.input.couponId;
    if (ctx.input.active !== undefined) params.active = ctx.input.active;

    let result = await client.listPromotionCodes(params);
    return {
      output: {
        promotionCodes: result.data.map((p: any) => ({
          promotionCodeId: p.id,
          code: p.code,
          couponId: p.promotion?.coupon?.id || p.promotion?.coupon || p.coupon?.id || p.coupon,
          active: p.active
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** promotion code(s)`
    };
  })
  .build();
