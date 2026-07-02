import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let priceRuleSchema = z.object({
  priceRuleId: z.string(),
  title: z.string(),
  targetType: z.string(),
  targetSelection: z.string(),
  allocationMethod: z.string(),
  valueType: z.string(),
  value: z.string(),
  oncePerCustomer: z.boolean(),
  usageLimit: z.number().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  createdAt: z.string()
});

let discountCodeSchema = z.object({
  discountCodeId: z.string(),
  priceRuleId: z.string(),
  code: z.string(),
  usageCount: z.number(),
  createdAt: z.string()
});

export let manageDiscounts = SlateTool.create(spec, {
  name: 'Manage Discounts',
  key: 'manage_discounts',
  description: `Create and manage discount codes and price rules. A price rule defines the discount logic (percentage off, fixed amount, etc.), and discount codes are the customer-facing codes tied to a price rule.
Supports:
- **list_price_rules**: List all price rules
- **create_price_rule**: Create a new price rule
- **delete_price_rule**: Delete a price rule
- **list_codes**: List discount codes for a price rule
- **create_code**: Create a discount code for a price rule
- **delete_code**: Delete a discount code
- **lookup_code**: Look up a discount code by its code string`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_price_rules',
          'create_price_rule',
          'delete_price_rule',
          'list_codes',
          'create_code',
          'delete_code',
          'lookup_code'
        ])
        .describe('Operation to perform'),
      priceRuleId: z
        .string()
        .optional()
        .describe('Price rule ID (required for code operations and delete_price_rule)'),
      discountCodeId: z.string().optional().describe('Discount code ID (for delete_code)'),
      code: z
        .string()
        .optional()
        .describe('Discount code string (for create_code and lookup_code)'),
      title: z.string().optional().describe('Price rule title (for create_price_rule)'),
      targetType: z
        .enum(['line_item', 'shipping_line'])
        .optional()
        .describe('What the rule applies to'),
      targetSelection: z.enum(['all', 'entitled']).optional().describe('Which items qualify'),
      allocationMethod: z
        .enum(['across', 'each'])
        .optional()
        .describe('How the discount is allocated'),
      valueType: z
        .enum(['percentage', 'fixed_amount'])
        .optional()
        .describe('Type of discount value'),
      value: z
        .string()
        .optional()
        .describe('Discount value (negative number, e.g., "-10.0" for 10% off or $10 off)'),
      oncePerCustomer: z
        .boolean()
        .optional()
        .describe('Whether limited to one use per customer'),
      usageLimit: z.number().optional().describe('Maximum total number of uses'),
      startsAt: z.string().optional().describe('When the rule takes effect (ISO 8601)'),
      endsAt: z.string().optional().describe('When the rule expires (ISO 8601)'),
      limit: z.number().min(1).max(250).optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      priceRules: z.array(priceRuleSchema).optional(),
      priceRule: priceRuleSchema.optional(),
      discountCodes: z.array(discountCodeSchema).optional(),
      discountCode: discountCodeSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapPriceRule = (pr: any) => ({
      priceRuleId: String(pr.id),
      title: pr.title,
      targetType: pr.target_type,
      targetSelection: pr.target_selection,
      allocationMethod: pr.allocation_method,
      valueType: pr.value_type,
      value: pr.value,
      oncePerCustomer: pr.once_per_customer,
      usageLimit: pr.usage_limit,
      startsAt: pr.starts_at,
      endsAt: pr.ends_at,
      createdAt: pr.created_at
    });

    let mapCode = (dc: any) => ({
      discountCodeId: String(dc.id),
      priceRuleId: String(dc.price_rule_id),
      code: dc.code,
      usageCount: dc.usage_count,
      createdAt: dc.created_at
    });

    if (ctx.input.action === 'list_price_rules') {
      let rules = await client.listPriceRules({ limit: ctx.input.limit });
      return {
        output: { priceRules: rules.map(mapPriceRule) },
        message: `Found **${rules.length}** price rule(s).`
      };
    }

    if (ctx.input.action === 'create_price_rule') {
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.targetType) data.target_type = ctx.input.targetType;
      if (ctx.input.targetSelection) data.target_selection = ctx.input.targetSelection;
      if (ctx.input.allocationMethod) data.allocation_method = ctx.input.allocationMethod;
      if (ctx.input.valueType) data.value_type = ctx.input.valueType;
      if (ctx.input.value) data.value = ctx.input.value;
      if (ctx.input.oncePerCustomer !== undefined)
        data.once_per_customer = ctx.input.oncePerCustomer;
      if (ctx.input.usageLimit !== undefined) data.usage_limit = ctx.input.usageLimit;
      if (ctx.input.startsAt) data.starts_at = ctx.input.startsAt;
      if (ctx.input.endsAt) data.ends_at = ctx.input.endsAt;
      data.customer_selection = 'all';

      let pr = await client.createPriceRule(data);
      return {
        output: { priceRule: mapPriceRule(pr) },
        message: `Created price rule **${pr.title}** (${pr.value_type}: ${pr.value}).`
      };
    }

    if (ctx.input.action === 'delete_price_rule') {
      if (!ctx.input.priceRuleId) throw shopifyServiceError('priceRuleId is required');
      await client.deletePriceRule(ctx.input.priceRuleId);
      return {
        output: { deleted: true },
        message: `Deleted price rule **${ctx.input.priceRuleId}**.`
      };
    }

    if (ctx.input.action === 'list_codes') {
      if (!ctx.input.priceRuleId) throw shopifyServiceError('priceRuleId is required');
      let codes = await client.listDiscountCodes(ctx.input.priceRuleId, {
        limit: ctx.input.limit
      });
      return {
        output: { discountCodes: codes.map(mapCode) },
        message: `Found **${codes.length}** discount code(s).`
      };
    }

    if (ctx.input.action === 'create_code') {
      if (!ctx.input.priceRuleId) throw shopifyServiceError('priceRuleId is required');
      if (!ctx.input.code) throw shopifyServiceError('code is required');
      let dc = await client.createDiscountCode(ctx.input.priceRuleId, {
        code: ctx.input.code
      });
      return {
        output: { discountCode: mapCode(dc) },
        message: `Created discount code **${dc.code}**.`
      };
    }

    if (ctx.input.action === 'delete_code') {
      if (!ctx.input.priceRuleId) throw shopifyServiceError('priceRuleId is required');
      if (!ctx.input.discountCodeId) throw shopifyServiceError('discountCodeId is required');
      await client.deleteDiscountCode(ctx.input.priceRuleId, ctx.input.discountCodeId);
      return {
        output: { deleted: true },
        message: `Deleted discount code **${ctx.input.discountCodeId}**.`
      };
    }

    if (ctx.input.action === 'lookup_code') {
      if (!ctx.input.code) throw shopifyServiceError('code is required');
      let dc = await client.lookupDiscountCode(ctx.input.code);
      return {
        output: { discountCode: mapCode(dc) },
        message: `Found discount code **${dc.code}** (used ${dc.usage_count} times).`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
