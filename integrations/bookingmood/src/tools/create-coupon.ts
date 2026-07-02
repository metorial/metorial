import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createCoupon = SlateTool.create(spec, {
  name: 'Create Coupon',
  key: 'create_coupon',
  description: `Creates a new discount coupon. Configure the code, discount definition, scope, stackability, and optional usage quota.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      code: z.string().describe('The coupon code guests will enter'),
      description: z.string().optional().describe('Coupon description'),
      scope: z
        .enum(['global', 'product', 'service', 'rent'])
        .describe('Where the coupon applies'),
      definition: z
        .any()
        .describe('Price expression defining the discount (type, value, restrictions)'),
      stackable: z
        .boolean()
        .optional()
        .describe('Whether this coupon can be combined with others'),
      quota: z.number().optional().describe('Maximum number of uses (null for unlimited)')
    })
  )
  .output(
    z.object({
      couponId: z.string().describe('UUID of the created coupon'),
      code: z.string().describe('Coupon code'),
      scope: z.string().describe('Coupon scope'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {
      code: ctx.input.code,
      scope: ctx.input.scope,
      definition: ctx.input.definition
    };
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.stackable !== undefined) data.stackable = ctx.input.stackable;
    if (ctx.input.quota !== undefined) data.quota = ctx.input.quota;

    let result = await client.createCoupon(data);

    return {
      output: {
        couponId: result.id,
        code: result.code,
        scope: result.scope,
        createdAt: result.created_at
      },
      message: `Coupon **${result.code}** created with scope "${result.scope}".`
    };
  })
  .build();
