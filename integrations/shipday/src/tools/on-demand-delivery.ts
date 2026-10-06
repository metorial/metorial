import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import type { Row } from '../lib/validation';
import {
  fail,
  id,
  optionalBoolean,
  optionalNumber,
  optionalString,
  parse
} from '../lib/validation';
import { spec } from '../spec';

let serviceSchema = z.object({
  name: z.string().describe('Service provider name'),
  prod: z.boolean().describe('Whether the service is in production mode'),
  status: z.boolean().describe('Whether the service is enabled')
});

let estimateSchema = z.object({
  estimateId: z.string().nullish().describe('Estimate identifier'),
  providerName: z.string().nullish().describe('Service provider name'),
  fee: z.number().nullish().describe('Delivery fee'),
  pickupTime: z.string().nullish().describe('Estimated pickup time (ISO 8601)'),
  deliveryTime: z.string().nullish().describe('Estimated delivery time (ISO 8601)'),
  pickupDurationMinutes: z.number().nullish().describe('Pickup duration in minutes'),
  deliveryDurationMinutes: z.number().nullish().describe('Delivery duration in minutes'),
  hasError: z.boolean().nullish().describe('Whether an error occurred'),
  errorCode: z.string().nullish().describe('Error code if applicable'),
  errorMessage: z.string().nullish().describe('Error message if applicable')
});

let assignmentSchema = z.object({
  assignmentId: z.number().nullish().describe('Assignment record ID'),
  orderId: z.number().nullish().describe('Order ID'),
  thirdPartyName: z.string().nullish().describe('Provider name'),
  referenceId: z.string().nullish().describe('Third-party reference ID'),
  thirdPartyFee: z.number().nullish().describe('Provider fee'),
  status: z.string().nullish().describe('Delivery status'),
  driverName: z.string().nullish().describe('Driver name'),
  driverPhone: z.string().nullish().describe('Driver phone'),
  driverLatitude: z.number().nullish().describe('Driver latitude'),
  driverLongitude: z.number().nullish().describe('Driver longitude'),
  trackingUrl: z.string().nullish().describe('Tracking URL'),
  tip: z.number().nullish().describe('Tip amount')
});

export let onDemandDelivery = SlateTool.create(spec, {
  name: 'On-Demand Delivery',
  key: 'on_demand_delivery',
  description: `Manage third-party on-demand delivery services (e.g., DoorDash, Uber). List available services, get cost/time estimates, assign an order to a provider, get assignment details, or cancel an assignment.`,
  instructions: [
    'Use action "services" to list available third-party delivery providers.',
    'Use action "estimate" with an orderId to get pricing and timing estimates.',
    'Use action "assign" with orderId and providerName to assign an order to a provider.',
    'Use action "details" with an orderId to get assignment details.',
    'Use action "cancel" with an orderId to cancel an on-demand assignment.'
  ],
  constraints: [
    'Availability, account billing setup, cancellation fees and provider restrictions depend on your Shipday account. Assignment can dispatch a courier and incur charges.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['services', 'estimate', 'assign', 'details', 'cancel'])
        .describe('Action to perform'),
      orderId: z
        .number()
        .optional()
        .describe('Order ID (required for estimate, assign, details, cancel)'),
      providerName: z
        .string()
        .optional()
        .describe('Third-party provider name (required for assign)'),
      tip: z.number().optional().describe('Tip amount (for assign)'),
      estimateReference: z.string().optional().describe('Estimate reference ID (for assign)'),
      contactlessDelivery: z
        .boolean()
        .optional()
        .describe('Request contactless delivery (for assign)'),
      proofOfDeliveryType: z
        .enum(['PHOTO', 'SIGNATURE', 'PIN', 'NONE'])
        .optional()
        .describe('Proof of delivery type (for assign)')
    })
  )
  .output(
    z.object({
      services: z.array(serviceSchema).optional().describe('Available delivery services'),
      estimate: estimateSchema.optional().describe('Delivery estimate'),
      assignment: assignmentSchema.optional().describe('Assignment details'),
      cancelled: z.boolean().optional().describe('Whether cancellation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input,
      client = new ShipdayClient({ token: ctx.auth.token });
    if (input.action === 'services') {
      if (
        input.orderId !== undefined ||
        input.providerName !== undefined ||
        input.tip !== undefined ||
        input.estimateReference !== undefined ||
        input.contactlessDelivery !== undefined ||
        input.proofOfDeliveryType !== undefined
      )
        fail('Service discovery does not accept order or assignment fields.');
      const services = (await client.getOnDemandServices()).map(value =>
        parse(serviceSchema, value)
      );
      return {
        output: { services },
        message: `Retrieved ${services.length} on-demand services.`
      };
    }
    const orderId = id(input.orderId, 'Order ID');
    if (
      input.action !== 'assign' &&
      [
        input.providerName,
        input.tip,
        input.estimateReference,
        input.contactlessDelivery,
        input.proofOfDeliveryType
      ].some(value => value !== undefined)
    )
      fail('Assignment fields are only accepted with action assign.');
    if (input.action === 'estimate') {
      const result = await client.getOnDemandEstimate(orderId);
      const estimate = parse(estimateSchema, {
        estimateId: optionalString(result.id),
        providerName: optionalString(result.name),
        fee: optionalNumber(result.fee),
        pickupTime: optionalString(result.pickupTime),
        deliveryTime: optionalString(result.deliveryTime),
        pickupDurationMinutes: optionalNumber(result.pickupDuration),
        deliveryDurationMinutes: optionalNumber(result.deliveryDuration),
        hasError: optionalBoolean(result.error),
        errorCode: optionalString(result.errorCode),
        errorMessage: optionalString(result.errorMessage)
      });
      if (estimate.estimateId == null && estimate.hasError !== true)
        fail('Shipday returned neither an estimate ID nor an explicit estimate error.');
      return {
        output: { estimate },
        message: estimate.hasError
          ? 'Shipday returned an estimate error; no courier was assigned.'
          : 'Retrieved the native fee and duration estimate. Currency is not inferred.'
      };
    }
    const mapAssignment = (result: Record<string, unknown>) =>
      parse(assignmentSchema, {
        assignmentId: optionalNumber(result.id),
        orderId: optionalNumber(result.orderId),
        thirdPartyName: optionalString(result.thirdPartyName),
        referenceId: optionalString(result.referenceId),
        thirdPartyFee: optionalNumber(result.thirdPartyFee),
        status: optionalString(result.status),
        driverName: optionalString(result.driverName),
        driverPhone: optionalString(result.driverPhone),
        driverLatitude: optionalNumber(result.driverLat),
        driverLongitude: optionalNumber(result.driverLng),
        trackingUrl: optionalString(result.trackingUrl),
        tip: optionalNumber(result.tip)
      });
    if (input.action === 'assign') {
      if (!input.providerName) fail('providerName is required for assignment.');
      const accepted = await client.assignOnDemandDelivery({
        orderId,
        name: input.providerName,
        tip: input.tip,
        estimateReference: input.estimateReference,
        contactlessDelivery: input.contactlessDelivery,
        podType: input.proofOfDeliveryType
      });
      let current: Row;
      try {
        current = await client.getOnDemandDetails(orderId);
      } catch {
        return client.partial(orderId, [
          `On-demand assignment ${accepted.id} accepted; courier dispatch or charges may remain`
        ]);
      }
      if (
        current.id !== accepted.id ||
        accepted.thirdPartyName !== input.providerName ||
        current.thirdPartyName !== input.providerName ||
        (accepted.referenceId != null && current.referenceId !== accepted.referenceId)
      )
        return client.partial(orderId, [
          `On-demand assignment ${accepted.id} accepted; exact assignment/provider readback differed`
        ]);
      const assignment = mapAssignment(current);
      return {
        output: { assignment },
        message: `On-demand assignment ${accepted.id} accepted; observed state: ${assignment.status ?? 'not provided'}. Dispatch and charges may apply.`
      };
    }
    if (input.action === 'details') {
      const assignment = mapAssignment(await client.getOnDemandDetails(orderId));
      return {
        output: { assignment },
        message: `Retrieved on-demand state: ${assignment.status ?? 'not provided'}.`
      };
    }
    const before = await client.getOnDemandDetails(orderId);
    await client.cancelOnDemandDelivery(orderId);
    let current: Row;
    try {
      current = await client.getOnDemandDetails(orderId);
    } catch {
      return client.partial(orderId, [
        'Cancellation accepted; completion and any charges are unconfirmed'
      ]);
    }
    if (
      current.id !== before.id ||
      (before.thirdPartyName != null && current.thirdPartyName !== before.thirdPartyName) ||
      (before.referenceId != null && current.referenceId !== before.referenceId)
    )
      return client.partial(orderId, [
        `Cancellation accepted for assignment ${before.id}; exact assignment readback differed`
      ]);
    const assignment = mapAssignment(current),
      cancelled = assignment.status === 'CANCELLED';
    return {
      output: { cancelled, assignment },
      message: cancelled
        ? 'Cancellation accepted and CANCELLED state observed. Prior charges may remain.'
        : 'Cancellation accepted; CANCELLED state has not yet been observed. Read details before retrying; prior charges may remain.'
    };
  })
  .build();
