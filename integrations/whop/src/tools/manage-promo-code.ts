import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhopClient } from '../lib/client';
import { spec } from '../spec';

let promoCodeOutputSchema = z.object({
  promoCodeId: z.string().describe('Unique promo code identifier'),
  code: z.string().describe('The promo code string'),
  promoType: z.string().describe('Discount type: percentage or flat_amount'),
  amountOff: z.number().describe('Discount amount (percentage value or flat amount)'),
  currency: z.string().describe('Currency code'),
  status: z.string().describe('Status: active, inactive, or archived'),
  stock: z.number().nullable().describe('Remaining stock'),
  uses: z.number().describe('Number of times used'),
  unlimitedStock: z.boolean().describe('Whether stock is unlimited'),
  expiresAt: z.string().nullable().describe('Expiration date'),
  newUsersOnly: z.boolean().describe('Restricted to new users only'),
  onePerCustomer: z.boolean().describe('Limited to one use per customer'),
  productId: z.string().nullable().describe('Scoped product ID'),
  createdAt: z.string().describe('ISO 8601 creation timestamp')
});

let mapPromoCode = (p: any) => ({
  promoCodeId: p.id,
  code: p.code,
  promoType: p.promo_type,
  amountOff: p.amount_off,
  currency: p.currency,
  status: p.status,
  stock: p.stock ?? null,
  uses: p.uses || 0,
  unlimitedStock: p.unlimited_stock || false,
  expiresAt: p.expires_at || null,
  newUsersOnly: p.new_users_only || false,
  onePerCustomer: p.one_per_customer || false,
  productId: p.product?.id || null,
  createdAt: p.created_at
});

export let managePromoCode = SlateTool.create(spec, {
  name: 'Manage Promo Code',
  key: 'manage_promo_code',
  description: `Create, retrieve, list, or delete Whop promo codes. Promo codes apply percentage or fixed-amount discounts to plans during checkout.
Use **action** to specify: \`create\`, \`get\`, \`list\`, or \`delete\`.`,
  instructions: [
    'For "create": companyId, code, promoType, amountOff, baseCurrency, and promoDurationMonths are required.',
    'For "get": promoCodeId is required.',
    'For "list": companyId is required.',
    'For "delete": promoCodeId is required.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Operation to perform'),
      promoCodeId: z.string().optional().describe('Promo code ID (for get, delete)'),
      companyId: z
        .string()
        .optional()
        .describe('Company ID (for create, list). Uses config companyId if not provided.'),
      code: z.string().optional().describe('The promo code string (for create)'),
      promoType: z.enum(['percentage', 'flat_amount']).optional().describe('Discount type'),
      amountOff: z.number().optional().describe('Discount amount'),
      baseCurrency: z.string().optional().describe('Currency code (for create)'),
      promoDurationMonths: z
        .number()
        .optional()
        .describe('Duration in months the promo lasts'),
      newUsersOnly: z.boolean().optional().describe('Restrict to new users only'),
      productId: z.string().optional().describe('Scope to a specific product'),
      planIds: z.array(z.string()).optional().describe('Scope to specific plans'),
      stock: z.number().optional().describe('Available stock'),
      unlimitedStock: z.boolean().optional().describe('Whether stock is unlimited'),
      expiresAt: z.string().optional().describe('Expiration date (ISO 8601)'),
      onePerCustomer: z.boolean().optional().describe('Limit one per customer'),
      churnedUsersOnly: z.boolean().optional().describe('Restrict to churned users only'),
      existingMembershipsOnly: z
        .boolean()
        .optional()
        .describe('Restrict to existing memberships only'),
      status: z
        .enum(['active', 'inactive', 'archived'])
        .optional()
        .describe('Filter by status (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      limit: z.number().optional().describe('Number of results (for list)')
    })
  )
  .output(
    z.object({
      promoCode: promoCodeOutputSchema
        .nullable()
        .describe('Promo code data (for get, create)'),
      promoCodes: z
        .array(promoCodeOutputSchema)
        .optional()
        .describe('List of promo codes (for list)'),
      deleted: z.boolean().optional().describe('Whether the promo code was deleted'),
      hasNextPage: z
        .boolean()
        .optional()
        .describe('Whether more results are available (for list)'),
      endCursor: z.string().nullable().optional().describe('Cursor for next page (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhopClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.promoCodeId) throw new Error('promoCodeId is required for get');
      let p = await client.getPromoCode(ctx.input.promoCodeId);
      return {
        output: { promoCode: mapPromoCode(p), endCursor: null },
        message: `Retrieved promo code **${p.code}** (\`${p.id}\`): ${p.promo_type === 'percentage' ? `${p.amount_off}% off` : `${p.currency.toUpperCase()} ${p.amount_off} off`}.`
      };
    }

    if (action === 'list') {
      let companyId = ctx.input.companyId || ctx.config.companyId;
      if (!companyId) throw new Error('companyId is required for list');

      let result = await client.listPromoCodes({
        companyId,
        productIds: ctx.input.productId ? [ctx.input.productId] : undefined,
        planIds: ctx.input.planIds,
        status: ctx.input.status
      });

      let promoCodes = (result.data || []).map(mapPromoCode);
      return {
        output: {
          promoCode: null,
          promoCodes,
          hasNextPage: result.page_info?.has_next_page || false,
          endCursor: result.page_info?.end_cursor || null
        },
        message: `Found **${promoCodes.length}** promo codes.`
      };
    }

    if (action === 'create') {
      let companyId = ctx.input.companyId || ctx.config.companyId;
      if (!companyId) throw new Error('companyId is required for create');
      if (!ctx.input.code) throw new Error('code is required for create');
      if (!ctx.input.promoType) throw new Error('promoType is required for create');
      if (ctx.input.amountOff === undefined)
        throw new Error('amountOff is required for create');
      if (!ctx.input.baseCurrency) throw new Error('baseCurrency is required for create');
      if (ctx.input.promoDurationMonths === undefined)
        throw new Error('promoDurationMonths is required for create');

      let p = await client.createPromoCode({
        companyId,
        code: ctx.input.code,
        promoType: ctx.input.promoType,
        amountOff: ctx.input.amountOff,
        baseCurrency: ctx.input.baseCurrency,
        promoDurationMonths: ctx.input.promoDurationMonths,
        newUsersOnly: ctx.input.newUsersOnly || false,
        productId: ctx.input.productId,
        planIds: ctx.input.planIds,
        stock: ctx.input.stock,
        unlimitedStock: ctx.input.unlimitedStock,
        expiresAt: ctx.input.expiresAt,
        onePerCustomer: ctx.input.onePerCustomer,
        churnedUsersOnly: ctx.input.churnedUsersOnly,
        existingMembershipsOnly: ctx.input.existingMembershipsOnly
      });

      return {
        output: { promoCode: mapPromoCode(p), endCursor: null },
        message: `Created promo code **${p.code}** (\`${p.id}\`): ${p.promo_type === 'percentage' ? `${p.amount_off}% off` : `${p.currency.toUpperCase()} ${p.amount_off} off`}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.promoCodeId) throw new Error('promoCodeId is required for delete');
      let result = await client.deletePromoCode(ctx.input.promoCodeId);
      return {
        output: { promoCode: null, deleted: !!result, endCursor: null },
        message: `Deleted promo code \`${ctx.input.promoCodeId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
