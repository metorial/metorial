import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompletionDetails = SlateTool.create(spec, {
  name: 'Update Completion Details',
  key: 'update_completion_details',
  description: `Update the completion status and details of an order. Use this to programmatically mark orders as completed, failed, cancelled, or update timestamps and notes.`,
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
      notes: z.string().optional().describe('Completion notes')
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

    let body: Record<string, unknown> = {};
    if (ctx.input.orderNo) body.orderNo = ctx.input.orderNo;
    if (ctx.input.orderId) body.id = ctx.input.orderId;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.startTime) body.startTime = ctx.input.startTime;
    if (ctx.input.endTime) body.endTime = ctx.input.endTime;
    if (ctx.input.notes) body.notes = ctx.input.notes;

    let result = await client.updateCompletionDetails(body);

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
