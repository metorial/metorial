import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let couponSchema = z.object({
  couponId: z.number(),
  code: z.string(),
  discountType: z.string(),
  amount: z.string(),
  description: z.string(),
  dateExpires: z.string().nullable(),
  usageCount: z.number(),
  usageLimit: z.number().nullable(),
  usageLimitPerUser: z.number().nullable(),
  individualUse: z.boolean(),
  freeShipping: z.boolean(),
  minimumAmount: z.string(),
  maximumAmount: z.string(),
  productIds: z.array(z.number()),
  excludedProductIds: z.array(z.number()),
  productCategories: z.array(z.number()),
  excludedProductCategories: z.array(z.number()),
  dateCreated: z.string()
});

export let manageCoupons = SlateTool.create(spec, {
  name: 'Manage Coupons',
  key: 'manage_coupons',
  description: `List, get, create, update, or delete discount coupons. Configure discount types (percentage, fixed cart, fixed product), usage limits, product/category restrictions, and expiration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      couponId: z.number().optional().describe('Coupon ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      search: z.string().optional().describe('Search term for list'),
      code: z.string().optional().describe('Coupon code (required for create)'),
      discountType: z
        .enum(['percent', 'fixed_cart', 'fixed_product'])
        .optional()
        .describe('Discount type'),
      amount: z.string().optional().describe('Discount amount'),
      description: z.string().optional().describe('Coupon description'),
      dateExpires: z.string().optional().describe('Expiration date (ISO 8601)'),
      individualUse: z
        .boolean()
        .optional()
        .describe('Whether this coupon can only be used alone'),
      freeShipping: z.boolean().optional().describe('Whether coupon grants free shipping'),
      usageLimit: z.number().optional().describe('Total usage limit'),
      usageLimitPerUser: z.number().optional().describe('Usage limit per customer'),
      minimumAmount: z.string().optional().describe('Minimum order total required'),
      maximumAmount: z.string().optional().describe('Maximum order total allowed'),
      productIds: z.array(z.number()).optional().describe('Product IDs coupon applies to'),
      excludedProductIds: z
        .array(z.number())
        .optional()
        .describe('Product IDs excluded from coupon'),
      productCategories: z
        .array(z.number())
        .optional()
        .describe('Category IDs coupon applies to'),
      excludedProductCategories: z
        .array(z.number())
        .optional()
        .describe('Category IDs excluded from coupon'),
      excludeSaleItems: z.boolean().optional().describe('Whether to exclude sale items'),
      force: z.boolean().optional().default(false).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      coupons: z.array(couponSchema).optional(),
      coupon: couponSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      if (ctx.input.search) params.search = ctx.input.search;

      let coupons = await client.listCoupons(params);
      let mapped = coupons.map((c: any) => mapCoupon(c));

      return {
        output: { coupons: mapped },
        message: `Found **${mapped.length}** coupons.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.couponId) throw new Error('couponId is required for get action');
      let coupon = await client.getCoupon(ctx.input.couponId);

      return {
        output: { coupon: mapCoupon(coupon) },
        message: `Retrieved coupon **"${coupon.code}"** (ID: ${coupon.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.code) throw new Error('code is required for create action');

      let data = buildCouponData(ctx.input);
      data.code = ctx.input.code;

      let coupon = await client.createCoupon(data);

      return {
        output: { coupon: mapCoupon(coupon) },
        message: `Created coupon **"${coupon.code}"** (ID: ${coupon.id}, type: ${coupon.discount_type}, amount: ${coupon.amount}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.couponId) throw new Error('couponId is required for update action');

      let data = buildCouponData(ctx.input);
      if (ctx.input.code) data.code = ctx.input.code;

      let coupon = await client.updateCoupon(ctx.input.couponId, data);

      return {
        output: { coupon: mapCoupon(coupon) },
        message: `Updated coupon **"${coupon.code}"** (ID: ${coupon.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.couponId) throw new Error('couponId is required for delete action');

      await client.deleteCoupon(ctx.input.couponId, ctx.input.force);

      return {
        output: { deleted: true },
        message: `Deleted coupon (ID: ${ctx.input.couponId}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let buildCouponData = (input: any) => {
  let data: Record<string, any> = {};

  if (input.discountType) data.discount_type = input.discountType;
  if (input.amount) data.amount = input.amount;
  if (input.description !== undefined) data.description = input.description;
  if (input.dateExpires) data.date_expires = input.dateExpires;
  if (input.individualUse !== undefined) data.individual_use = input.individualUse;
  if (input.freeShipping !== undefined) data.free_shipping = input.freeShipping;
  if (input.usageLimit !== undefined) data.usage_limit = input.usageLimit;
  if (input.usageLimitPerUser !== undefined)
    data.usage_limit_per_user = input.usageLimitPerUser;
  if (input.minimumAmount) data.minimum_amount = input.minimumAmount;
  if (input.maximumAmount) data.maximum_amount = input.maximumAmount;
  if (input.productIds) data.product_ids = input.productIds;
  if (input.excludedProductIds) data.excluded_product_ids = input.excludedProductIds;
  if (input.productCategories) data.product_categories = input.productCategories;
  if (input.excludedProductCategories)
    data.excluded_product_categories = input.excludedProductCategories;
  if (input.excludeSaleItems !== undefined) data.exclude_sale_items = input.excludeSaleItems;

  return data;
};

let mapCoupon = (c: any) => ({
  couponId: c.id,
  code: c.code || '',
  discountType: c.discount_type || '',
  amount: c.amount || '0',
  description: c.description || '',
  dateExpires: c.date_expires || null,
  usageCount: c.usage_count || 0,
  usageLimit: c.usage_limit ?? null,
  usageLimitPerUser: c.usage_limit_per_user ?? null,
  individualUse: c.individual_use || false,
  freeShipping: c.free_shipping || false,
  minimumAmount: c.minimum_amount || '0',
  maximumAmount: c.maximum_amount || '0',
  productIds: c.product_ids || [],
  excludedProductIds: c.excluded_product_ids || [],
  productCategories: c.product_categories || [],
  excludedProductCategories: c.excluded_product_categories || [],
  dateCreated: c.date_created || ''
});
