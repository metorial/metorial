import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { rawResponseSchema } from '../lib/response';
import { spec } from '../spec';

let identity = {
  couponId: z
    .string()
    .optional()
    .describe('Coupon ID from list_coupons; provide couponId or code'),
  code: z
    .string()
    .optional()
    .describe('Coupon code, case-insensitive; provide code or couponId'),
  email: z.string().describe('Customer email address')
};

let output = z.object({
  status: z.string().describe('Provider operation status'),
  count: z.number().describe('Number of returned grants'),
  result: rawResponseSchema.describe(
    'Complete provider eligibility response, including original grant and expiry timestamps'
  )
});

export let grantCouponEligibility = SlateTool.create(spec, {
  key: 'grant_coupon_eligibility',
  name: 'Grant Coupon Eligibility',
  description:
    'Start a customer email’s eligibility window for a shared coupon. Existing grants keep their original start time; this does not reset or extend them. Required for redemption when a coupon has validForDays configured.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...identity,
      grantedAt: z
        .string()
        .optional()
        .describe(
          'Eligibility start in ISO 8601 format. Omit to use the provider’s current time; ignored for an existing grant'
        )
    })
  )
  .output(output)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).couponGrants(
      pickDefined({
        id: ctx.input.couponId,
        code: ctx.input.code,
        email: ctx.input.email,
        granted_at: ctx.input.grantedAt
      }),
      true
    );
    return {
      output: { status: result.status, count: result.count, result },
      message:
        'Retrieved the customer’s coupon eligibility grant. Existing grants retain their original eligibility date.'
    };
  })
  .build();

export let getCouponEligibility = SlateTool.create(spec, {
  key: 'get_coupon_eligibility',
  name: 'Get Coupon Eligibility',
  description:
    'Look up an existing customer email’s grant for a shared coupon, including the provider’s eligibility and expiration details. Does not create or reset a grant.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(identity))
  .output(output)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).couponGrants(
      pickDefined({
        id: ctx.input.couponId,
        code: ctx.input.code,
        email: ctx.input.email
      }),
      false
    );
    return {
      output: { status: result.status, count: result.count, result },
      message: 'Retrieved the customer’s coupon eligibility details.'
    };
  })
  .build();
