import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let serviceSchema = z.object({
  name: z.string().describe('Service provider name'),
  prod: z.boolean().describe('Whether the service is in production mode'),
  status: z.boolean().describe('Whether the service is enabled')
});

let estimateSchema = z.object({
  estimateId: z.string().optional().describe('Estimate identifier'),
  providerName: z.string().optional().describe('Service provider name'),
  fee: z.number().optional().describe('Delivery fee'),
  pickupTime: z.string().optional().describe('Estimated pickup time (ISO 8601)'),
  deliveryTime: z.string().optional().describe('Estimated delivery time (ISO 8601)'),
  pickupDurationMinutes: z.number().optional().describe('Pickup duration in minutes'),
  deliveryDurationMinutes: z.number().optional().describe('Delivery duration in minutes'),
  hasError: z.boolean().optional().describe('Whether an error occurred'),
  errorCode: z.string().optional().describe('Error code if applicable'),
  errorMessage: z.string().optional().describe('Error message if applicable')
});

let assignmentSchema = z.object({
  assignmentId: z.number().optional().describe('Assignment record ID'),
  orderId: z.number().optional().describe('Order ID'),
  thirdPartyName: z.string().optional().describe('Provider name'),
  referenceId: z.string().optional().describe('Third-party reference ID'),
  thirdPartyFee: z.number().optional().describe('Provider fee'),
  status: z.string().optional().describe('Delivery status'),
  driverName: z.string().optional().describe('Driver name'),
  driverPhone: z.string().optional().describe('Driver phone'),
  driverLatitude: z.number().optional().describe('Driver latitude'),
  driverLongitude: z.number().optional().describe('Driver longitude'),
  trackingUrl: z.string().optional().describe('Tracking URL'),
  tip: z.number().optional().describe('Tip amount')
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
  constraints: ['Requires Professional plan, US location, and valid credit card on file.'],
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
    let client = new ShipdayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'services') {
      let result = await client.getOnDemandServices();
      let services = Array.isArray(result) ? result : [];
      return {
        output: { services },
        message: `Found **${services.length}** on-demand delivery service(s): ${services.map((s: Record<string, unknown>) => s.name).join(', ')}.`
      };
    }

    if (ctx.input.action === 'estimate') {
      if (!ctx.input.orderId) throw new Error('orderId is required for estimate');
      let result = await client.getOnDemandEstimate(ctx.input.orderId);
      let estimate = {
        estimateId: result.id,
        providerName: result.name,
        fee: result.fee,
        pickupTime: result.pickupTime,
        deliveryTime: result.deliveryTime,
        pickupDurationMinutes: result.pickupDuration,
        deliveryDurationMinutes: result.deliveryDuration,
        hasError: result.error,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage
      };
      return {
        output: { estimate },
        message: `Estimate from **${estimate.providerName}**: $${estimate.fee} fee, pickup in ${estimate.pickupDurationMinutes}min, delivery in ${estimate.deliveryDurationMinutes}min.`
      };
    }

    if (ctx.input.action === 'assign') {
      if (!ctx.input.orderId || !ctx.input.providerName) {
        throw new Error('orderId and providerName are required for assign');
      }
      let params: {
        orderId: number;
        name: string;
        tip?: number;
        estimateReference?: string;
        contactlessDelivery?: boolean;
        podType?: string;
      } = {
        orderId: ctx.input.orderId,
        name: ctx.input.providerName
      };
      if (ctx.input.tip !== undefined) params.tip = ctx.input.tip;
      if (ctx.input.estimateReference) params.estimateReference = ctx.input.estimateReference;
      if (ctx.input.contactlessDelivery !== undefined)
        params.contactlessDelivery = ctx.input.contactlessDelivery;
      if (ctx.input.proofOfDeliveryType) params.podType = ctx.input.proofOfDeliveryType;

      let result = await client.assignOnDemandDelivery(params);
      let assignment = {
        assignmentId: result.id,
        orderId: result.orderId,
        thirdPartyName: result.thirdPartyName,
        referenceId: result.referenceId,
        thirdPartyFee: result.thirdPartyFee,
        status: result.status,
        driverName: result.driverName,
        driverPhone: result.driverPhone,
        driverLatitude: result.driverLat,
        driverLongitude: result.driverLng,
        trackingUrl: result.trackingUrl,
        tip: result.tip
      };
      return {
        output: { assignment },
        message: `Assigned order **${ctx.input.orderId}** to **${ctx.input.providerName}**. Status: ${assignment.status}.`
      };
    }

    if (ctx.input.action === 'details') {
      if (!ctx.input.orderId) throw new Error('orderId is required for details');
      let result = await client.getOnDemandDetails(ctx.input.orderId);
      let assignment = {
        assignmentId: result.id,
        orderId: result.orderId,
        thirdPartyName: result.thirdPartyName,
        referenceId: result.referenceId,
        thirdPartyFee: result.thirdPartyFee,
        status: result.status,
        driverName: result.driverName,
        driverPhone: result.driverPhone,
        driverLatitude: result.driverLat,
        driverLongitude: result.driverLng,
        trackingUrl: result.trackingUrl,
        tip: result.tip
      };
      return {
        output: { assignment },
        message: `On-demand delivery for order **${ctx.input.orderId}** via **${assignment.thirdPartyName}**: Status **${assignment.status}**.`
      };
    }

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.orderId) throw new Error('orderId is required for cancel');
      let result = await client.cancelOnDemandDelivery(ctx.input.orderId);
      return {
        output: { cancelled: result.success ?? true },
        message: `Cancelled on-demand delivery for order **${ctx.input.orderId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
