import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageCoupons = SlateTool.create(spec, {
  name: 'Manage Coupons',
  key: 'manage_coupons',
  description: `Create and retrieve coupons in Klaviyo, and bulk-create coupon codes. Coupons are used in campaigns and flows to offer discounts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'create_codes']).describe('Action to perform'),
      couponId: z.string().optional().describe('Coupon ID (required for create_codes)'),
      externalId: z
        .string()
        .optional()
        .describe('External ID for the coupon (required for create)'),
      description: z.string().optional().describe('Coupon description'),
      codes: z
        .array(z.string())
        .optional()
        .describe('Unique coupon codes to create (for create_codes)'),
      filter: z.string().optional().describe('Filter string for listing'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      coupons: z
        .array(
          z.object({
            couponId: z.string().describe('Coupon ID'),
            externalId: z.string().optional().describe('External ID'),
            description: z.string().optional().describe('Coupon description')
          })
        )
        .optional()
        .describe('Coupon results'),
      couponId: z.string().optional().describe('ID of the created coupon'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
      hasMore: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, couponId, externalId, description, codes, filter, pageCursor, pageSize } =
      ctx.input;

    if (action === 'list') {
      let result = await client.getCoupons({ filter, pageCursor, pageSize });
      let coupons = result.data.map(c => ({
        couponId: c.id ?? '',
        externalId: c.attributes?.external_id ?? undefined,
        description: c.attributes?.description ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { coupons, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${coupons.length}** coupons`
      };
    }

    if (action === 'create') {
      if (!externalId) throw new Error('externalId is required');
      let result = await client.createCoupon({ external_id: externalId, description });
      let c = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { couponId: c?.id, success: true },
        message: `Created coupon **${externalId}** (${c?.id})`
      };
    }

    if (action === 'create_codes') {
      if (!couponId) throw new Error('couponId is required');
      if (!codes?.length) throw new Error('codes are required');
      await client.createCouponCodes(couponId, codes);
      return {
        output: { couponId, success: true },
        message: `Created **${codes.length}** coupon codes for coupon **${couponId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
