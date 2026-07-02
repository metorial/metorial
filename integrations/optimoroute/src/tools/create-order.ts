import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z
  .object({
    locationNo: z.string().optional().describe('Existing location identifier'),
    address: z.string().optional().describe('Address to geocode if no coordinates provided'),
    latitude: z.number().optional().describe('GPS latitude'),
    longitude: z.number().optional().describe('GPS longitude'),
    locationName: z.string().optional().describe('Display name for the location'),
    checkInTime: z.number().optional().describe('Minimum waiting time in minutes'),
    notes: z.string().optional().describe('Notes about the location'),
    acceptPartialMatch: z.boolean().optional().describe('Accept partial geocoding match'),
    acceptMultipleResults: z.boolean().optional().describe('Accept multiple geocoding results')
  })
  .describe('Location for the order');

let timeWindowSchema = z
  .object({
    twFrom: z.string().describe('Start of time window (HH:MM)'),
    twTo: z.string().describe('End of time window (HH:MM)')
  })
  .describe('Service time window');

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a single order (delivery, pickup, or task) in OptimoRoute. Supports address geocoding for resolving addresses to coordinates. Use this for creating individual orders with full location validation. For bulk operations, use the **Bulk Create/Update Orders** tool instead.`,
  constraints: [
    'Only one of address or latitude/longitude should be provided for location',
    'Address geocoding is only available on single order creation'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['CREATE', 'UPDATE', 'SYNC', 'MERGE'])
        .default('CREATE')
        .describe(
          'CREATE: create new, UPDATE: update existing, SYNC: full replace, MERGE: partial update'
        ),
      orderNo: z.string().describe('Unique order number'),
      date: z.string().describe('Order date (YYYY-MM-DD)'),
      type: z.enum(['D', 'P', 'T']).default('D').describe('D=delivery, P=pickup, T=task'),
      location: locationSchema,
      duration: z.number().optional().describe('Service time in minutes'),
      timeWindows: z.array(timeWindowSchema).optional().describe('Service time windows'),
      priority: z
        .enum(['L', 'M', 'H', 'C'])
        .optional()
        .describe('L=low, M=medium, H=high, C=critical'),
      load1: z.number().optional().describe('Load dimension 1'),
      load2: z.number().optional().describe('Load dimension 2'),
      load3: z.number().optional().describe('Load dimension 3'),
      load4: z.number().optional().describe('Load dimension 4'),
      skills: z.array(z.string()).optional().describe('Required driver skills'),
      vehicleFeatures: z.array(z.string()).optional().describe('Required vehicle features'),
      assignedTo: z
        .object({
          serial: z.string().optional(),
          externalId: z.string().optional()
        })
        .optional()
        .describe('Assign to a specific driver'),
      notes: z.string().optional().describe('Free-form order notes'),
      email: z.string().optional().describe('Customer email for notifications'),
      phone: z.string().optional().describe('Customer phone for notifications'),
      notificationPreference: z
        .enum(['dont_notify', 'email', 'sms', 'both'])
        .optional()
        .describe('Customer notification method'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field key-value pairs'),
      relatedOrderNo: z.string().optional().describe('Linked pickup/delivery order number'),
      allowedWeekdays: z
        .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
        .optional()
        .describe('Allowed weekdays for scheduling')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      orderId: z.string().optional().describe('System-assigned order ID'),
      location: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Resolved location with coordinates'),
      geocodingResults: z
        .array(z.unknown())
        .optional()
        .describe('Geocoding results if address was provided'),
      code: z.string().optional().describe('Error or warning code'),
      message: z.string().optional().describe('Error or warning message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      operation: ctx.input.operation,
      orderNo: ctx.input.orderNo,
      date: ctx.input.date,
      type: ctx.input.type,
      location: ctx.input.location
    };

    if (ctx.input.duration !== undefined) body.duration = ctx.input.duration;
    if (ctx.input.timeWindows) body.timeWindows = ctx.input.timeWindows;
    if (ctx.input.priority) body.priority = ctx.input.priority;
    if (ctx.input.load1 !== undefined) body.load1 = ctx.input.load1;
    if (ctx.input.load2 !== undefined) body.load2 = ctx.input.load2;
    if (ctx.input.load3 !== undefined) body.load3 = ctx.input.load3;
    if (ctx.input.load4 !== undefined) body.load4 = ctx.input.load4;
    if (ctx.input.skills) body.skills = ctx.input.skills;
    if (ctx.input.vehicleFeatures) body.vehicleFeatures = ctx.input.vehicleFeatures;
    if (ctx.input.assignedTo) body.assignedTo = ctx.input.assignedTo;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.notificationPreference)
      body.notificationPreference = ctx.input.notificationPreference;
    if (ctx.input.customFields) body.customFields = ctx.input.customFields;
    if (ctx.input.relatedOrderNo) body.relatedOrderNo = ctx.input.relatedOrderNo;
    if (ctx.input.allowedWeekdays) body.allowedWeekdays = ctx.input.allowedWeekdays;

    let result = await client.createOrder(body);

    return {
      output: {
        success: result.success,
        orderId: result.id,
        location: result.location,
        geocodingResults: result.geocodingResults,
        code: result.code,
        message: result.message
      },
      message: result.success
        ? `Order **${ctx.input.orderNo}** created successfully for ${ctx.input.date}.`
        : `Failed to create order **${ctx.input.orderNo}**: ${result.message || result.code || 'Unknown error'}`
    };
  })
  .build();
