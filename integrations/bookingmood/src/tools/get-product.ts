import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieves a single product (rental unit) by ID with full details including name, pricing configuration, location, and settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      productId: z.string().describe('UUID of the product to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('UUID of the product'),
      organizationId: z.string().describe('UUID of the organization'),
      name: z.any().describe('Localized product name'),
      description: z.any().nullable().describe('Localized description'),
      rentPeriod: z.string().describe('Billing interval: daily or nightly'),
      timezone: z.string().describe('Product timezone'),
      interaction: z.string().nullable().describe('Booking flow type: request or book'),
      currency: z.string().nullable().describe('Transaction currency'),
      rentPricingDefinition: z
        .string()
        .nullable()
        .describe('Pricing model: configuration or services'),
      confirmAfterInitialPayment: z
        .boolean()
        .nullable()
        .describe('Auto-confirm after payment'),
      cooldownTime: z.number().nullable().describe('Minimum days between bookings'),
      approximateAddress: z.string().nullable().describe('Approximate address'),
      exactAddress: z.string().nullable().describe('Exact address'),
      hideExactAddress: z.boolean().nullable().describe('Whether to hide exact address'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let p = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: p.id,
        organizationId: p.organization_id,
        name: p.name,
        description: p.description ?? null,
        rentPeriod: p.rent_period,
        timezone: p.timezone,
        interaction: p.interaction ?? null,
        currency: p.currency ?? null,
        rentPricingDefinition: p.rent_pricing_definition ?? null,
        confirmAfterInitialPayment: p.confirm_after_initial_payment ?? null,
        cooldownTime: p.cooldown_time ?? null,
        approximateAddress: p.approximate_address ?? null,
        exactAddress: p.exact_address ?? null,
        hideExactAddress: p.hide_exact_address ?? null,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Product **${typeof p.name === 'object' ? JSON.stringify(p.name) : p.name}** retrieved.`
    };
  })
  .build();
