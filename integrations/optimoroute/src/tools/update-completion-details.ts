import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateOrderReference } from '../lib/client';
import { spec } from '../spec';

export let updateCompletionDetails = SlateTool.create(spec, {
  name: 'Update Completion Details',
  key: 'update_completion_details',
  description: `Update the completion status and details of an order. Use this to programmatically mark orders as completed, failed, cancelled, or update service timestamps. Completion note updates are not documented by the API.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderNo: z.string().optional().describe('Order number'),
      orderId: z.string().optional().describe('System-assigned order ID'),
      status: z
        .enum([
          'success',
          'failed',
          'rejected',
          'cancelled',
          'scheduled',
          'on_route',
          'servicing'
        ])
        .optional()
        .describe('New order status'),
      startTime: z
        .object({
          unixTimestamp: z.number().optional(),
          utcTime: z.string().optional(),
          localTime: z.string().optional()
        })
        .optional()
        .describe('Service start time'),
      endTime: z
        .object({
          unixTimestamp: z.number().optional(),
          utcTime: z.string().optional(),
          localTime: z.string().optional()
        })
        .optional()
        .describe('Service end time'),
      notes: z
        .string()
        .optional()
        .describe('Completion notes. Note updates are not documented by the provider API.')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    validateOrderReference({ orderNo: ctx.input.orderNo, id: ctx.input.orderId });
    if (!ctx.input.status) {
      throw createApiServiceError('Provide the new completion status.');
    }
    if (ctx.input.notes !== undefined) {
      throw createApiServiceError(
        'OptimoRoute does not document completion note updates through this API. Update notes in the driver app.'
      );
    }
    for (let [label, time] of [
      ['startTime', ctx.input.startTime],
      ['endTime', ctx.input.endTime]
    ] as const) {
      if (!time) continue;
      if (time.unixTimestamp === undefined && !time.utcTime && !time.localTime) {
        throw createApiServiceError(
          `Provide unixTimestamp, utcTime, or localTime for ${label}.`
        );
      }
      if (time.unixTimestamp !== undefined && !Number.isSafeInteger(time.unixTimestamp)) {
        throw createApiServiceError(
          `${label}.unixTimestamp must be a whole number of seconds.`
        );
      }
    }
    if (
      ctx.input.startTime &&
      !['servicing', 'success', 'failed'].includes(ctx.input.status)
    ) {
      throw createApiServiceError(
        'startTime applies only to servicing, success, or failed status.'
      );
    }
    if (ctx.input.endTime && !['success', 'failed'].includes(ctx.input.status)) {
      throw createApiServiceError('endTime applies only to success or failed status.');
    }

    let result = await client.updateCompletionDetails({
      orderNo: ctx.input.orderNo,
      id: ctx.input.orderId,
      data: {
        status: ctx.input.status,
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime
      }
    });
    let update = result.updates?.[0] ?? result.orders?.[0];
    if (!update || typeof update.success !== 'boolean') {
      throw createApiServiceError('OptimoRoute returned no completion update result.');
    }
    if (!update.success) {
      throw createApiServiceError(
        `OptimoRoute completion update failed: ${update.message || update.code || 'Unknown API error'}`,
        {
          upstreamCode: update.code
        }
      );
    }
    result = update;

    return {
      output: {
        success: result.success,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Order **${ctx.input.orderNo || ctx.input.orderId}** completion updated${ctx.input.status ? ` to **${ctx.input.status}**` : ''}.`
        : `Failed to update completion: ${result.message || result.code}`
    };
  })
  .build();
