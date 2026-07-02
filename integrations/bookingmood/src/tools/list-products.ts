import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().describe('UUID of the product'),
  name: z.any().describe('Localized product name'),
  rentPeriod: z.string().describe('Billing interval: daily or nightly'),
  timezone: z.string().describe('Product timezone'),
  interaction: z.string().nullable().describe('Booking flow: request or book'),
  currency: z.string().nullable().describe('Transaction currency'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Lists rental units/products with optional filtering and pagination. Products represent bookable units in Bookingmood.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z.record(z.string(), z.string()).optional().describe('PostgREST-style filters'),
      order: z.string().optional().describe('Sort order, e.g. "created_at.desc"'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let products = await client.listProducts({
      select: 'id,name,rent_period,timezone,interaction,currency,created_at,updated_at',
      filters: ctx.input.filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (products || []).map((p: any) => ({
      productId: p.id,
      name: p.name,
      rentPeriod: p.rent_period,
      timezone: p.timezone,
      interaction: p.interaction ?? null,
      currency: p.currency ?? null,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { products: mapped },
      message: `Found **${mapped.length}** product(s).`
    };
  })
  .build();
