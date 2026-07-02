import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCoupon = SlateTool.create(spec, {
  name: 'Manage Coupon',
  key: 'manage_coupon',
  description: `List, create, update, or delete coupons for marketing promotions. Supports percentage, dollar amount, free shipping, and product-specific discount types.`,
  instructions: [
    'Use action "list" to retrieve coupons.',
    'Use action "create" to create a new coupon with a code, type, and amount.',
    'Use action "update" to modify an existing coupon.',
    'Use action "delete" to remove a coupon.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      couponId: z.number().optional().describe('Coupon ID (required for update/delete)'),
      name: z.string().optional().describe('Coupon display name'),
      code: z.string().optional().describe('Coupon code (required for create)'),
      type: z
        .enum([
          'per_item_discount',
          'per_total_discount',
          'shipping_discount',
          'free_shipping',
          'percentage_discount'
        ])
        .optional()
        .describe('Discount type (required for create)'),
      amount: z.number().optional().describe('Discount amount (required for create)'),
      enabled: z.boolean().optional().describe('Whether the coupon is enabled'),
      minPurchase: z.number().optional().describe('Minimum purchase amount'),
      maxUses: z.number().optional().describe('Maximum total uses'),
      maxUsesPerCustomer: z.number().optional().describe('Maximum uses per customer'),
      expires: z.string().optional().describe('Expiration date (RFC 2822 format)'),
      appliesTo: z
        .object({
          entityType: z
            .enum(['categories', 'products'])
            .describe('Entity type the coupon applies to'),
          entityIds: z.array(z.number()).describe('Array of entity IDs')
        })
        .optional()
        .describe('What the coupon applies to'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      coupon: z.any().optional().describe('The created or updated coupon'),
      coupons: z.array(z.any()).optional().describe('List of coupons'),
      deleted: z.boolean().optional().describe('Whether the coupon was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.name) params.name = ctx.input.name;
      if (ctx.input.code) params.code = ctx.input.code;
      let coupons = await client.listCoupons(params);
      return {
        output: { coupons },
        message: `Found ${coupons.length} coupons.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.couponId)
        throw bigcommerceServiceError('couponId is required for delete');
      await client.deleteCoupon(ctx.input.couponId);
      return {
        output: { deleted: true },
        message: `Deleted coupon with ID ${ctx.input.couponId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.code) data.code = ctx.input.code;
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.amount !== undefined) data.amount = String(ctx.input.amount);
    if (ctx.input.enabled !== undefined) data.enabled = ctx.input.enabled;
    if (ctx.input.minPurchase !== undefined) data.min_purchase = String(ctx.input.minPurchase);
    if (ctx.input.maxUses !== undefined) data.max_uses = ctx.input.maxUses;
    if (ctx.input.maxUsesPerCustomer !== undefined)
      data.max_uses_per_customer = ctx.input.maxUsesPerCustomer;
    if (ctx.input.expires) data.expires = ctx.input.expires;
    if (ctx.input.appliesTo) {
      data.applies_to = {
        entity: ctx.input.appliesTo.entityType,
        ids: ctx.input.appliesTo.entityIds
      };
    }

    if (ctx.input.action === 'create') {
      let coupon = await client.createCoupon(data);
      return {
        output: { coupon },
        message: `Created coupon **${coupon.name}** (code: ${coupon.code}).`
      };
    }

    if (!ctx.input.couponId) throw bigcommerceServiceError('couponId is required for update');
    let coupon = await client.updateCoupon(ctx.input.couponId, data);
    return {
      output: { coupon },
      message: `Updated coupon **${coupon.name}** (ID: ${ctx.input.couponId}).`
    };
  })
  .build();
