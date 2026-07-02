import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSchedulingInfo = SlateTool.create(spec, {
  name: 'Get Scheduling Info',
  key: 'get_scheduling_info',
  description: `Look up the scheduling status and details of an individual order, including assigned driver, stop number, scheduled service time, and travel distance/time from the previous stop. For bulk lookups, use the **Search Orders** tool with includeScheduleInformation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderNo: z.string().optional().describe('Order number'),
      orderId: z.string().optional().describe('System-assigned order ID')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      orderScheduled: z.boolean().optional().describe('Whether the order is on a route'),
      scheduleInformation: z
        .object({
          stopNumber: z.number().optional(),
          scheduledAt: z.string().optional().describe('Scheduled time (HH:MM)'),
          scheduledAtDt: z.string().optional().describe('Scheduled datetime'),
          arrivalTimeDt: z.string().optional().describe('Arrival datetime'),
          driverSerial: z.string().optional(),
          driverExternalId: z.string().optional(),
          driverName: z.string().optional(),
          vehicleLabel: z.string().optional(),
          vehicleRegistration: z.string().optional(),
          distance: z.number().optional().describe('Distance from previous stop in meters'),
          travelTime: z
            .number()
            .optional()
            .describe('Travel time from previous stop in seconds')
        })
        .optional(),
      code: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSchedulingInfo(ctx.input.orderNo, ctx.input.orderId);

    return {
      output: {
        success: result.success,
        orderScheduled: result.orderScheduled,
        scheduleInformation: result.scheduleInformation,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? result.orderScheduled
          ? `Order **${ctx.input.orderNo || ctx.input.orderId}** is scheduled at stop #${result.scheduleInformation?.stopNumber} with driver **${result.scheduleInformation?.driverName || 'N/A'}**.`
          : `Order **${ctx.input.orderNo || ctx.input.orderId}** is not currently scheduled.`
        : `Failed to get scheduling info: ${result.message || result.code}`
    };
  })
  .build();
