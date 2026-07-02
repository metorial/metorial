import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { lemonSqueezyServiceError } from '../lib/errors';
import { spec } from '../spec';

let discountFields = {
  discountId: z.string(),
  deleted: z.boolean(),
  storeId: z.number().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  amount: z.number().optional(),
  amountType: z.string().optional(),
  isLimitedToProducts: z.boolean().optional(),
  isLimitedRedemptions: z.boolean().optional(),
  maxRedemptions: z.number().optional(),
  status: z.string().optional(),
  statusFormatted: z.string().optional(),
  duration: z.string().optional(),
  durationInMonths: z.number().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  testMode: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
};

let formatDiscount = (discount: any) => ({
  discountId: discount.id,
  deleted: false,
  storeId: discount.attributes.store_id,
  name: discount.attributes.name,
  code: discount.attributes.code,
  amount: discount.attributes.amount,
  amountType: discount.attributes.amount_type,
  isLimitedToProducts: discount.attributes.is_limited_to_products,
  isLimitedRedemptions: discount.attributes.is_limited_redemptions,
  maxRedemptions: discount.attributes.max_redemptions,
  status: discount.attributes.status,
  statusFormatted: discount.attributes.status_formatted,
  duration: discount.attributes.duration,
  durationInMonths: discount.attributes.duration_in_months,
  startsAt: discount.attributes.starts_at,
  expiresAt: discount.attributes.expires_at,
  testMode: discount.attributes.test_mode,
  createdAt: discount.attributes.created_at,
  updatedAt: discount.attributes.updated_at
});

export let manageDiscountTool = SlateTool.create(spec, {
  name: 'Manage Discount',
  key: 'manage_discount',
  description:
    'Retrieve or delete a Lemon Squeezy discount. Use action "get" to inspect discount status and rules, or action "delete" to permanently remove a discount code.',
  constraints: ['Deleting a discount is permanent.']
})
  .input(
    z.object({
      action: z.enum(['get', 'delete']).describe('The discount action to perform'),
      discountId: z.string().describe('The discount ID')
    })
  )
  .output(z.object(discountFields))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.discountId) {
      throw lemonSqueezyServiceError('discountId is required.');
    }

    if (ctx.input.action === 'delete') {
      await client.deleteDiscount(ctx.input.discountId);
      return {
        output: {
          discountId: ctx.input.discountId,
          deleted: true
        },
        message: `Deleted discount **${ctx.input.discountId}**.`
      };
    }

    let response = await client.getDiscount(ctx.input.discountId);
    let output = formatDiscount(response.data);

    return {
      output,
      message: `Retrieved discount **${output.code}** — ${output.statusFormatted}.`
    };
  })
  .build();
