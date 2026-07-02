import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDiscountRedemptionsTool = SlateTool.create(spec, {
  name: 'List Discount Redemptions',
  key: 'list_discount_redemptions',
  description:
    'Retrieve discount redemption records from Lemon Squeezy. Use this to inspect where discount codes were redeemed and audit discount usage.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      discountId: z.string().optional().describe('Filter redemptions by discount ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      discountRedemptions: z.array(
        z.object({
          discountRedemptionId: z.string(),
          discountId: z.number(),
          orderId: z.number(),
          discountName: z.string(),
          discountCode: z.string(),
          discountAmount: z.number(),
          discountAmountType: z.string(),
          amount: z.number(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listDiscountRedemptions({
      discountId: ctx.input.discountId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let discountRedemptions = (response.data || []).map((redemption: any) => ({
      discountRedemptionId: redemption.id,
      discountId: redemption.attributes.discount_id,
      orderId: redemption.attributes.order_id,
      discountName: redemption.attributes.discount_name,
      discountCode: redemption.attributes.discount_code,
      discountAmount: redemption.attributes.discount_amount,
      discountAmountType: redemption.attributes.discount_amount_type,
      amount: redemption.attributes.amount,
      createdAt: redemption.attributes.created_at,
      updatedAt: redemption.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { discountRedemptions, hasMore },
      message: `Found **${discountRedemptions.length}** discount redemption(s).`
    };
  })
  .build();
