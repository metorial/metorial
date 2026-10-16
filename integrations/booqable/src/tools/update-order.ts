import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateNumber, validatePeriod } from '../lib/client';
import { buildClientConfig, flattenSingleResource } from '../lib/helpers';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's details or progress its status through the workflow. Can update rental dates, customer assignment, discounts, deposits, tags, and status transitions. Use manage_order_items for pickups and returns.`,
  instructions: [
    'Rental dates are company-local wall times written with a Z suffix; do not convert them to actual UTC.',
    'Use draft/reserved/archived/canceled for status changes. started/stopped are available here only for reversions; use manage_order_items for pickups and returns.',
    'Details are saved before the status transition. If the transition fails, those details may already be saved.'
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
      taxRegionId: z.string().optional().describe('Updated tax region ID'),
      revert: z
        .boolean()
        .optional()
        .describe(
          'Explicitly revert to an earlier status. Required for started/stopped here.'
        ),
      confirmShortage: z
        .boolean()
        .optional()
        .describe('Explicitly confirm shortage warnings when reserving the order')
    })
  )
  .output(
    z.object({
      order: z.record(z.string(), z.any()).describe('The updated order record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    validatePeriod(ctx.input.startsAt, ctx.input.stopsAt);
    validateNumber(ctx.input.discountPercentage, 'Discount percentage', { min: 0, max: 100 });
    validateNumber(ctx.input.depositValue, 'Deposit value', {
      min: 0,
      ...(ctx.input.depositType?.startsWith('percentage') ? { max: 100 } : {})
    });
    if (
      (ctx.input.status === 'started' || ctx.input.status === 'stopped') &&
      !ctx.input.revert
    ) {
      throw createApiServiceError(
        'Use manage_order_items for pickups and returns. Set revert only to move back to an earlier status.'
      );
    }
    if (
      !ctx.input.status &&
      (ctx.input.revert !== undefined || ctx.input.confirmShortage !== undefined)
    ) {
      throw createApiServiceError('Provide status when setting revert or confirmShortage.');
    }
    let attributes: Record<string, any> = {};
    if (ctx.input.startsAt) attributes.starts_at = ctx.input.startsAt;
    if (ctx.input.stopsAt) attributes.stops_at = ctx.input.stopsAt;
    if (ctx.input.customerId) attributes.customer_id = ctx.input.customerId;
    if (ctx.input.discountPercentage !== undefined)
      Object.assign(attributes, {
        discount_type: 'percentage',
        discount_value: ctx.input.discountPercentage
      });
    if (ctx.input.depositType) attributes.deposit_type = ctx.input.depositType;
    if (ctx.input.depositValue !== undefined)
      attributes.deposit_value = ctx.input.depositValue;
    if (ctx.input.tags) attributes.tag_list = ctx.input.tags;
    if (ctx.input.couponId) attributes.coupon_id = ctx.input.couponId;
    if (ctx.input.taxRegionId) attributes.tax_region_id = ctx.input.taxRegionId;

    if (!Object.keys(attributes).length && !ctx.input.status) {
      throw createApiServiceError('Provide at least one order field or a status to update.');
    }
    let response = Object.keys(attributes).length
      ? await client.updateOrder(ctx.input.orderId, attributes)
      : await client.getOrder(ctx.input.orderId);
    if (ctx.input.status && response.data?.attributes?.status !== ctx.input.status) {
      await client.createResource('order_status_transitions', 'order_status_transitions', {
        order_id: ctx.input.orderId,
        transition_from: response.data?.attributes?.status,
        transition_to: ctx.input.status,
        ...(ctx.input.revert !== undefined ? { revert: ctx.input.revert } : {}),
        ...(ctx.input.confirmShortage !== undefined
          ? { confirm_shortage: ctx.input.confirmShortage }
          : {})
      });
      response = await client.getOrder(ctx.input.orderId);
    }
    let order = flattenSingleResource(response);

    return {
      output: { order },
      message: `Updated order **${order?.number || ctx.input.orderId}** (status: ${order?.status}).`
    };
  })
  .build();
