import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new rental order in Booqable. Set the rental period, assign a customer, configure discounts and deposits. The order starts in "new" status and can be progressed through the workflow.`,
  instructions: [
    'Dates must be in ISO 8601 format (e.g. "2024-01-15T10:00:00+00:00").',
    'After creating the order, use Update Order to change its status (e.g. to "reserved").'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      startsAt: z.string().optional().describe('Rental start date/time in ISO 8601 format'),
      stopsAt: z.string().optional().describe('Rental end date/time in ISO 8601 format'),
      customerId: z.string().optional().describe('Customer ID to assign to the order'),
      discountPercentage: z.number().optional().describe('Discount percentage for the order'),
      discountValue: z.number().optional().describe('Fixed discount value in cents'),
      depositType: z
        .enum(['none', 'percentage_total', 'percentage', 'fixed'])
        .optional()
        .describe('Deposit type'),
      depositValue: z.number().optional().describe('Deposit value'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the order'),
      couponId: z.string().optional().describe('Coupon ID to apply'),
      locationId: z.string().optional().describe('Pickup location ID'),
      taxRegionId: z.string().optional().describe('Tax region ID')
    })
  )
  .output(
    z.object({
      order: z.record(z.string(), z.any()).describe('The newly created order record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {};
    if (ctx.input.startsAt) attributes.starts_at = ctx.input.startsAt;
    if (ctx.input.stopsAt) attributes.stops_at = ctx.input.stopsAt;
    if (ctx.input.customerId) attributes.customer_id = ctx.input.customerId;
    if (ctx.input.discountPercentage !== undefined)
      attributes.discount_percentage = ctx.input.discountPercentage;
    if (ctx.input.discountValue !== undefined)
      attributes.discount_value_in_cents = ctx.input.discountValue;
    if (ctx.input.depositType) attributes.deposit_type = ctx.input.depositType;
    if (ctx.input.depositValue !== undefined)
      attributes.deposit_value = ctx.input.depositValue;
    if (ctx.input.tags) attributes.tags = ctx.input.tags;
    if (ctx.input.couponId) attributes.coupon_id = ctx.input.couponId;
    if (ctx.input.locationId) attributes.location_id = ctx.input.locationId;
    if (ctx.input.taxRegionId) attributes.tax_region_id = ctx.input.taxRegionId;

    let response = await client.createOrder(attributes);
    let order = flattenSingleResource(response);

    return {
      output: { order },
      message: `Created order **${order?.number || order?.resourceId}**.`
    };
  })
  .build();
