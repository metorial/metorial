import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Updates an existing product (rental unit). Modify name, description, pricing, address, booking flow, or other settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('UUID of the product to update'),
      name: z.any().optional().describe('Localized product name'),
      description: z.any().optional().describe('Localized description'),
      rentPeriod: z.enum(['daily', 'nightly']).optional().describe('Billing interval'),
      timezone: z.string().optional().describe('Product timezone'),
      interaction: z.enum(['request', 'book']).optional().describe('Booking flow type'),
      currency: z.string().optional().describe('Transaction currency'),
      approximateAddress: z.string().optional().describe('Approximate address'),
      exactAddress: z.string().optional().describe('Exact address'),
      hideExactAddress: z.boolean().optional().describe('Whether to hide exact address'),
      cooldownTime: z.number().optional().describe('Minimum days between bookings'),
      confirmAfterInitialPayment: z.boolean().optional().describe('Auto-confirm after payment')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('UUID of the updated product'),
      name: z.any().describe('Product name'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.rentPeriod !== undefined) data.rent_period = ctx.input.rentPeriod;
    if (ctx.input.timezone !== undefined) data.timezone = ctx.input.timezone;
    if (ctx.input.interaction !== undefined) data.interaction = ctx.input.interaction;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.approximateAddress !== undefined)
      data.approximate_address = ctx.input.approximateAddress;
    if (ctx.input.exactAddress !== undefined) data.exact_address = ctx.input.exactAddress;
    if (ctx.input.hideExactAddress !== undefined)
      data.hide_exact_address = ctx.input.hideExactAddress;
    if (ctx.input.cooldownTime !== undefined) data.cooldown_time = ctx.input.cooldownTime;
    if (ctx.input.confirmAfterInitialPayment !== undefined)
      data.confirm_after_initial_payment = ctx.input.confirmAfterInitialPayment;

    let result = await client.updateProduct(ctx.input.productId, data);

    return {
      output: {
        productId: result.id,
        name: result.name,
        updatedAt: result.updated_at
      },
      message: `Product **${typeof result.name === 'object' ? JSON.stringify(result.name) : result.name}** updated.`
    };
  })
  .build();
