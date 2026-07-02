import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getRentalPrice = SlateTool.create(spec, {
  name: 'Get Rental Price',
  key: 'get_rental_price',
  description: `Calculates the rental price for a resource given a time period, quantity, and optional voucher code. Returns the total price along with a breakdown of applied pricing rules and products.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z.string().describe('ID of the resource'),
      startTime: z.string().describe('Rental start time'),
      endTime: z.string().describe('Rental end time'),
      quantity: z.number().describe('Number of units'),
      userId: z.string().optional().describe('User ID for user-dependent pricing'),
      voucherCode: z.string().optional().describe('Voucher/discount code to apply'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom form fields that may affect pricing')
    })
  )
  .output(
    z.object({
      totalPrice: z.number().describe('Total calculated price'),
      currency: z.string().describe('Currency code'),
      appliedRules: z.any().optional().describe('Pricing manager rules applied'),
      includedProducts: z
        .any()
        .optional()
        .describe('Additional products included in the price')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.getRentalPrice({
      resourceId: ctx.input.resourceId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      quantity: ctx.input.quantity,
      userId: ctx.input.userId,
      voucherCode: ctx.input.voucherCode,
      customFields: ctx.input.customFields
    });

    return {
      output: {
        totalPrice: Number(result.total),
        currency: result.currency,
        appliedRules: result.pricing_log_applied_rules,
        includedProducts: result.pricing_log_products
      },
      message: `Rental price for resource ${ctx.input.resourceId}: **${result.currency} ${result.total}** (${ctx.input.startTime} to ${ctx.input.endTime}, qty ${ctx.input.quantity}).`
    };
  })
  .build();
