import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  operation: z
    .enum(['CREATE', 'UPDATE', 'SYNC', 'MERGE'])
    .optional()
    .describe('Operation type; defaults to MERGE'),
  orderNo: z.string().describe('Unique order number'),
  date: z.string().describe('Order date (YYYY-MM-DD)'),
  type: z.enum(['D', 'P', 'T']).optional().describe('D=delivery, P=pickup, T=task'),
  location: z
    .object({
      locationNo: z.string().optional().describe('Existing location identifier'),
      latitude: z.number().optional().describe('GPS latitude'),
      longitude: z.number().optional().describe('GPS longitude'),
      locationName: z.string().optional().describe('Display name'),
      address: z.string().optional().describe('Address string'),
      notes: z.string().optional().describe('Location notes')
    })
    .optional()
    .describe('Order location (geocoding not available in bulk)'),
  duration: z.number().optional().describe('Service time in minutes'),
  timeWindows: z
    .array(
      z.object({
        twFrom: z.string(),
        twTo: z.string()
      })
    )
    .optional()
    .describe('Service time windows'),
  priority: z.enum(['L', 'M', 'H', 'C']).optional(),
  load1: z.number().optional(),
  load2: z.number().optional(),
  load3: z.number().optional(),
  load4: z.number().optional(),
  skills: z.array(z.string()).optional(),
  vehicleFeatures: z.array(z.string()).optional(),
  assignedTo: z
    .object({
      serial: z.string().optional(),
      externalId: z.string().optional()
    })
    .optional(),
  notes: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notificationPreference: z.enum(['dont_notify', 'email', 'sms', 'both']).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  relatedOrderNo: z.string().optional()
});

export let bulkCreateUpdateOrders = SlateTool.create(spec, {
  name: 'Bulk Create/Update Orders',
  key: 'bulk_create_update_orders',
  description: `Create or update multiple orders in a single request. Each order can specify its own operation type (CREATE, UPDATE, SYNC, MERGE). Address geocoding is **not** available in bulk; use coordinates or existing location identifiers instead.`,
  constraints: [
    'Maximum 500 orders per request',
    'Address geocoding is not available in bulk operations; provide coordinates or locationNo'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orders: z.array(orderSchema).describe('Array of orders to create or update (max 500)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('True if at least one order succeeded'),
      orders: z
        .array(
          z.object({
            success: z.boolean(),
            orderNo: z.string().optional(),
            orderId: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional()
          })
        )
        .describe('Per-order results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createOrUpdateOrders(ctx.input.orders);

    let orders = (result.orders || []).map((o: Record<string, unknown>) => ({
      success: o.success as boolean,
      orderNo: o.orderNo as string | undefined,
      orderId: o.id as string | undefined,
      code: o.code as string | undefined,
      message: o.message as string | undefined
    }));

    let successCount = orders.filter((o: { success: boolean }) => o.success).length;
    let failCount = orders.length - successCount;

    return {
      output: {
        success: result.success,
        orders
      },
      message: `Processed **${orders.length}** orders: **${successCount}** succeeded, **${failCount}** failed.`
    };
  })
  .build();
