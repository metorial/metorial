import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let completionDataSchema = z.object({
  orderNo: z.string().optional(),
  orderId: z.string().optional(),
  status: z
    .string()
    .optional()
    .describe(
      'Order status: unscheduled, scheduled, on_route, servicing, success, failed, rejected, cancelled'
    ),
  startTime: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Service start time (unixTimestamp, utcTime, localTime)'),
  endTime: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Service end time (unixTimestamp, utcTime, localTime)'),
  driverName: z.string().optional(),
  driverSerial: z.string().optional(),
  driverExternalId: z.string().optional(),
  notes: z.string().optional(),
  trackingUrl: z.string().optional().describe('Real-time order tracking URL'),
  form: z.record(z.string(), z.unknown()).optional().describe('Proof of delivery form data'),
  startPosition: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('GPS position at service start'),
  endPosition: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('GPS position at service end'),
  signatures: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Digital signature data'),
  photos: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Photo proof of delivery'),
  barcodes: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Barcode scan results')
});

export let getCompletionDetails = SlateTool.create(spec, {
  name: 'Get Completion Details',
  key: 'get_completion_details',
  description: `Retrieve completion status and proof of delivery data for one or more orders. Includes order status, service timestamps, driver info, GPS positions, tracking URL, and proof of delivery (signatures, photos, barcodes, notes, custom forms).`,
  constraints: ['Maximum 500 orders per request'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orders: z
        .array(
          z.object({
            orderNo: z.string().optional().describe('Order number'),
            orderId: z.string().optional().describe('System-assigned order ID')
          })
        )
        .describe('Orders to retrieve completion details for')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      orders: z.array(
        z.object({
          success: z.boolean(),
          orderNo: z.string().optional(),
          orderId: z.string().optional(),
          completionData: completionDataSchema.optional(),
          code: z.string().optional(),
          message: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let requestOrders = ctx.input.orders.map(o => {
      let req: Record<string, unknown> = {};
      if (o.orderNo) req.orderNo = o.orderNo;
      if (o.orderId) req.id = o.orderId;
      return req;
    });

    let result = await client.getCompletionDetails(requestOrders);

    let orders = (result.orders || []).map((o: Record<string, unknown>) => ({
      success: o.success as boolean,
      orderNo: o.orderNo as string | undefined,
      orderId: o.id as string | undefined,
      completionData: o.data as Record<string, unknown> | undefined,
      code: o.code as string | undefined,
      message: o.message as string | undefined
    }));

    let found = orders.filter((o: { success: boolean }) => o.success).length;

    return {
      output: {
        success: result.success,
        orders
      },
      message: `Retrieved completion details for **${found}** of **${orders.length}** orders.`
    };
  })
  .build();
