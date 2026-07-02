import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's details or progress its status through the workflow. Can update rental dates, customer assignment, discounts, deposits, tags, and status transitions (e.g. draft → reserved → started → stopped).`,
  instructions: [
    'Status must follow the workflow: new → draft → reserved → started → stopped → archived. Orders can also be canceled.',
    'Not all status transitions are valid — follow the standard Booqable order workflow.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The unique ID of the order to update'),
      status: z
        .enum(['draft', 'reserved', 'started', 'stopped', 'archived', 'canceled'])
        .optional()
        .describe('New status for the order'),
      startsAt: z.string().optional().describe('Updated rental start date/time in ISO 8601'),
      stopsAt: z.string().optional().describe('Updated rental end date/time in ISO 8601'),
      customerId: z.string().optional().describe('Updated customer ID'),
      discountPercentage: z.number().optional().describe('Updated discount percentage'),
      depositType: z
        .enum(['none', 'percentage_total', 'percentage', 'fixed'])
        .optional()
        .describe('Updated deposit type'),
      depositValue: z.number().optional().describe('Updated deposit value'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      couponId: z.string().optional().describe('Coupon ID to apply'),
      taxRegionId: z.string().optional().describe('Updated tax region ID')
    })
  )
  .output(
    z.object({
      order: z.record(z.string(), z.any()).describe('The updated order record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let attributes: Record<string, any> = {};
    if (ctx.input.status) attributes.status = ctx.input.status;
    if (ctx.input.startsAt) attributes.starts_at = ctx.input.startsAt;
    if (ctx.input.stopsAt) attributes.stops_at = ctx.input.stopsAt;
    if (ctx.input.customerId) attributes.customer_id = ctx.input.customerId;
    if (ctx.input.discountPercentage !== undefined)
      attributes.discount_percentage = ctx.input.discountPercentage;
    if (ctx.input.depositType) attributes.deposit_type = ctx.input.depositType;
    if (ctx.input.depositValue !== undefined)
      attributes.deposit_value = ctx.input.depositValue;
    if (ctx.input.tags) attributes.tags = ctx.input.tags;
    if (ctx.input.couponId) attributes.coupon_id = ctx.input.couponId;
    if (ctx.input.taxRegionId) attributes.tax_region_id = ctx.input.taxRegionId;

    let response = await client.updateOrder(ctx.input.orderId, attributes);
    let order = flattenSingleResource(response);

    return {
      output: { order },
      message: `Updated order **${order?.number || ctx.input.orderId}** (status: ${order?.status}).`
    };
  })
  .build();
