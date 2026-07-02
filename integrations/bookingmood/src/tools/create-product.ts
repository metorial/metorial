import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Creates a new product (rental unit). Requires a name, rent period, and timezone. Optionally configure pricing, address, and booking flow.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.any().describe('Localized product name (string or multi-language object)'),
      rentPeriod: z.enum(['daily', 'nightly']).describe('Billing interval'),
      timezone: z.string().describe('Product location timezone, e.g. "Europe/Amsterdam"'),
      interaction: z.enum(['request', 'book']).optional().describe('Booking flow type'),
      currency: z.string().optional().describe('Transaction currency code'),
      description: z
        .any()
        .optional()
        .describe('Localized description (string or multi-language object)'),
      approximateAddress: z.string().optional().describe('Approximate address'),
      exactAddress: z.string().optional().describe('Exact address'),
      hideExactAddress: z.boolean().optional().describe('Whether to hide exact address'),
      cooldownTime: z.number().optional().describe('Minimum days between bookings'),
      confirmAfterInitialPayment: z
        .boolean()
        .optional()
        .describe('Auto-confirm after initial payment')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('UUID of the created product'),
      name: z.any().describe('Product name'),
      rentPeriod: z.string().describe('Billing interval'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {
      name: ctx.input.name,
      rent_period: ctx.input.rentPeriod,
      timezone: ctx.input.timezone
    };
    if (ctx.input.interaction !== undefined) data.interaction = ctx.input.interaction;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.approximateAddress !== undefined)
      data.approximate_address = ctx.input.approximateAddress;
    if (ctx.input.exactAddress !== undefined) data.exact_address = ctx.input.exactAddress;
    if (ctx.input.hideExactAddress !== undefined)
      data.hide_exact_address = ctx.input.hideExactAddress;
    if (ctx.input.cooldownTime !== undefined) data.cooldown_time = ctx.input.cooldownTime;
    if (ctx.input.confirmAfterInitialPayment !== undefined)
      data.confirm_after_initial_payment = ctx.input.confirmAfterInitialPayment;

    let result = await client.createProduct(data);

    return {
      output: {
        productId: result.id,
        name: result.name,
        rentPeriod: result.rent_period,
        createdAt: result.created_at
      },
      message: `Product **${typeof result.name === 'object' ? JSON.stringify(result.name) : result.name}** created successfully.`
    };
  })
  .build();
