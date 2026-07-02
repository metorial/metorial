import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let couponSchema = z.object({
  couponId: z.string().describe('UUID of the coupon'),
  code: z.string().describe('Coupon code'),
  description: z.string().nullable().describe('Coupon description'),
  scope: z.string().describe('Coupon scope: global, product, service, or rent'),
  stackable: z.boolean().describe('Whether coupon can be combined with others'),
  quota: z.number().nullable().describe('Maximum usage limit'),
  definition: z.any().nullable().describe('Price expression for the discount'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listCoupons = SlateTool.create(spec, {
  name: 'List Coupons',
  key: 'list_coupons',
  description: `Lists discount coupons with optional filtering and pagination. Filter by code, scope, or stackability.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z.record(z.string(), z.string()).optional().describe('PostgREST-style filters'),
      order: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      coupons: z.array(couponSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let coupons = await client.listCoupons({
      select: 'id,code,description,scope,stackable,quota,definition,created_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (coupons || []).map((c: any) => ({
      couponId: c.id,
      code: c.code,
      description: c.description ?? null,
      scope: c.scope,
      stackable: c.stackable,
      quota: c.quota ?? null,
      definition: c.definition ?? null,
      createdAt: c.created_at
    }));

    return {
      output: { coupons: mapped },
      message: `Found **${mapped.length}** coupon(s).`
    };
  })
  .build();
