import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawResponseSchema } from '../lib/response';
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
  limitOnePerEmail: z.boolean().optional().describe('Whether each email can redeem only once'),
  validForDays: z
    .number()
    .nullable()
    .optional()
    .describe('Per-email eligibility window in days'),
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
  description: `List all coupons in your Zylvie store. Choose active coupons or archived coupons; the filter returns one group at a time.`,
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
      raw: rawResponseSchema,
      count: z.number().describe('Total number of coupons returned'),
      coupons: z.array(couponSchema).describe('List of coupons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCoupons(ctx.input.includeArchived);

    let coupons = result.coupons.map((c: Record<string, unknown>) => ({
      couponId: c.id as string,
      created: c.created as string,
      code: c.code as string,
      type: c.type as string,
      amount: c.amount as number,
      isStorewide: c.is_storewide as boolean,
      isLive: c.is_live as boolean,
      isArchived: c.is_archived as boolean,
      limitOnePerEmail: c.limit_one_per_email as boolean | undefined,
      validForDays: c.valid_for_days as number | null | undefined,
      limit: c.limit as number | null,
      durationInMonths: c.duration_in_months as number | null,
      start: c.start as string | null,
      end: c.end as string | null,
      redemptionCount: c.redemption_count as number,
      products: c.products as string[],
      affiliateId: c.affiliate as string | null,
      requiresSubscriptionProduct: c.requires_subscription_product as string | null
    }));

    return {
      output: {
        raw: result,
        count: result.count,
        coupons
      },
      message: `Found **${result.count}** coupon(s)${ctx.input.includeArchived ? ' (archived)' : ''}.`
    };
  })
  .build();
