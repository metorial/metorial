import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireValue, validateNumber } from '../lib/client';
import { buildClientConfig, flattenResourceList, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let manageCoupons = SlateTool.create(spec, {
  name: 'Manage Coupons',
  key: 'manage_coupons',
  description: `List, create, or update discount coupons. Coupons can offer percentage or fixed-amount discounts, redeemable online or in the back office.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'archive']).describe('Action to perform'),
      couponId: z.string().optional().describe('Coupon ID (required for update and archive)'),
      identifier: z.string().optional().describe('Coupon code identifier'),
      couponType: z.enum(['percentage', 'cents']).optional().describe('Discount type'),
      value: z.number().optional().describe('Discount value (percentage or cents amount)'),
      active: z.boolean().optional().describe('Whether the coupon is active'),
      pageNumber: z.number().optional().describe('Page number for list action'),
      pageSize: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      coupon: z.record(z.string(), z.any()).optional().describe('Created or updated coupon'),
      coupons: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of coupons (for list action)'),
      archived: z.boolean().optional().describe('Whether the coupon was archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    if (ctx.input.action === 'list') {
      let response = await client.listCoupons({
        pagination: {
          pageNumber: ctx.input.pageNumber,
          pageSize: ctx.input.pageSize
        }
      });
      let coupons = flattenResourceList(response);
      return {
        output: { coupons },
        message: `Found ${coupons.length} coupon(s).`
      };
    }

    if (ctx.input.action === 'create') {
      requireValue(ctx.input.identifier, 'Coupon identifier for create');
      requireValue(ctx.input.couponType, 'Coupon type for create');
      if (ctx.input.value === undefined)
        throw createApiServiceError('Coupon value is required for create.');
      validateNumber(ctx.input.value, 'Coupon value', {
        integer: true,
        min: 0,
        ...(ctx.input.couponType === 'percentage' ? { max: 100 } : {})
      });
      let attributes: Record<string, any> = {};
      if (ctx.input.identifier) attributes.identifier = ctx.input.identifier;
      if (ctx.input.couponType) attributes.coupon_type = ctx.input.couponType;
      if (ctx.input.value !== undefined) attributes.value = ctx.input.value;
      if (ctx.input.active !== undefined) attributes.active = ctx.input.active;

      let response = await client.createCoupon(attributes);
      let coupon = flattenSingleResource(response);
      return {
        output: { coupon },
        message: `Created coupon **${coupon?.identifier}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let couponId = requireValue(ctx.input.couponId, 'Coupon ID for update');
      let existing = (await client.getResource('coupons', couponId)).data?.attributes;
      if (
        (ctx.input.identifier !== undefined &&
          ctx.input.identifier !== existing?.identifier) ||
        (ctx.input.couponType !== undefined && ctx.input.couponType !== existing?.coupon_type)
      ) {
        throw createApiServiceError(
          'Coupon identifier and type are immutable. Create a new coupon to change them.'
        );
      }
      validateNumber(ctx.input.value, 'Coupon value', {
        integer: true,
        min: 0,
        ...(existing?.coupon_type === 'percentage' ? { max: 100 } : {})
      });
      let attributes: Record<string, any> = {};
      if (ctx.input.value !== undefined) attributes.value = ctx.input.value;
      if (ctx.input.active !== undefined) attributes.active = ctx.input.active;

      let response = await client.updateCoupon(couponId, attributes);
      let coupon = flattenSingleResource(response);
      return {
        output: { coupon },
        message: `Updated coupon **${coupon?.identifier || ctx.input.couponId}**.`
      };
    }

    {
      let couponId = requireValue(ctx.input.couponId, 'Coupon ID for archive');
      await client.archiveCoupon(couponId);
      return {
        output: { archived: true },
        message: `Archived coupon ${ctx.input.couponId}.`
      };
    }
  })
  .build();
