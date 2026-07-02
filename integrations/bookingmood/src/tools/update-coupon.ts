import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let updateCoupon = SlateTool.create(spec, {
  name: 'Update Coupon',
  key: 'update_coupon',
  description: `Updates an existing coupon. Modify the code, description, discount definition, scope, stackability, or quota.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      couponId: z.string().describe('UUID of the coupon to update'),
      code: z.string().optional().describe('New coupon code'),
      description: z.string().optional().describe('New description'),
      scope: z.enum(['global', 'product', 'service', 'rent']).optional().describe('New scope'),
      definition: z.any().optional().describe('New price expression'),
      stackable: z.boolean().optional().describe('Whether coupon can be combined'),
      quota: z.number().nullable().optional().describe('New usage limit')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('UUID of the updated coupon'),
      code: z.string().describe('Updated coupon code'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.code !== undefined) data.code = ctx.input.code;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.scope !== undefined) data.scope = ctx.input.scope;
    if (ctx.input.definition !== undefined) data.definition = ctx.input.definition;
    if (ctx.input.stackable !== undefined) data.stackable = ctx.input.stackable;
    if (ctx.input.quota !== undefined) data.quota = ctx.input.quota;

    let result = await client.updateCoupon(ctx.input.couponId, data);

    return {
      output: {
        couponId: result.id,
        code: result.code,
        updatedAt: result.updated_at
      },
      message: `Coupon **${result.code}** updated.`
    };
  })
  .build();
