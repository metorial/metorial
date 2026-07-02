import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let couponSchema = z.object({
  couponId: z.string().describe('Coupon ID'),
  created: z.string().describe('Creation timestamp'),
  code: z.string().describe('Coupon code'),
  type: z.string().describe('Discount type: percentage or fixed'),
  amount: z.number().describe('Discount amount'),
  isStorewide: z.boolean().describe('Whether the coupon applies to all products'),
  isLive: z.boolean().describe('Whether the coupon is active'),
  isArchived: z.boolean().describe('Whether the coupon is archived'),
  limit: z.number().nullable().describe('Maximum number of redemptions'),
  durationInMonths: z.number().nullable().describe('Subscription discount duration in months'),
  start: z.string().nullable().describe('Start date'),
  end: z.string().nullable().describe('Expiration date'),
  redemptionCount: z.number().describe('Number of times used'),
  products: z.array(z.string()).describe('Product IDs this coupon applies to'),
  affiliateId: z.string().nullable().describe('Associated affiliate ID'),
  requiresSubscriptionProduct: z
    .string()
    .nullable()
    .describe('Required subscription product ID')
});

export let listCoupons = SlateTool.create(spec, {
  name: 'List Coupons',
  key: 'list_coupons',
  description: `List all coupons in your Zylvie store. Optionally include archived coupons.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeArchived: z
        .boolean()
        .optional()
        .describe('Set to true to retrieve archived coupons instead of active ones')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of coupons returned'),
      coupons: z.array(couponSchema).describe('List of coupons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCoupons(ctx.input.includeArchived);

    let coupons = (result.coupons || []).map((c: Record<string, unknown>) => ({
      couponId: c.id as string,
      created: String(c.created),
      code: c.code as string,
      type: c.type as string,
      amount: c.amount as number,
      isStorewide: c.is_storewide as boolean,
      isLive: c.is_live as boolean,
      isArchived: (c.is_archived as boolean) || false,
      limit: (c.limit as number | null) ?? null,
      durationInMonths: (c.duration_in_months as number | null) ?? null,
      start: (c.start as string | null) ?? null,
      end: (c.end as string | null) ?? null,
      redemptionCount: c.redemption_count as number,
      products: (c.products as string[]) || [],
      affiliateId: (c.affiliate as string | null) ?? null,
      requiresSubscriptionProduct: (c.requires_subscription_product as string | null) ?? null
    }));

    return {
      output: {
        count: result.count,
        coupons
      },
      message: `Found **${result.count}** coupon(s)${ctx.input.includeArchived ? ' (including archived)' : ''}.`
    };
  })
  .build();
