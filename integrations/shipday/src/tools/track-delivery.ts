import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

export let trackDelivery = SlateTool.create(spec, {
  name: 'Track Delivery',
  key: 'track_delivery',
  description: `Retrieves real-time delivery progress and ETA for a specific order, including order status, carrier location, estimated time, and travel details. Optionally includes static data like customer, restaurant, and carrier info.`,
  constraints: [
    'Maximum 3 requests per minute per tracking ID.',
    'Requires Business Advanced plan.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      trackingId: z.string().describe('Tracking identifier for the order'),
      includeStaticData: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include static customer, restaurant, and carrier info')
    })
  )
  .output(
    z.object({
      fixedData: z
        .object({
          orderNumber: z.string().optional(),
          customerName: z.string().optional(),
          customerAddress: z.string().optional(),
          customerLatitude: z.number().optional(),
          customerLongitude: z.number().optional(),
          restaurantName: z.string().optional(),
          restaurantAddress: z.string().optional(),
          restaurantLatitude: z.number().optional(),
          restaurantLongitude: z.number().optional(),
          carrierName: z.string().optional(),
          carrierPhone: z.string().optional(),
          carrierImageUrl: z.string().optional(),
          isExpired: z.boolean().optional()
        })
        .optional()
        .describe('Static order details'),
      dynamicData: z
        .object({
          status: z.string().optional(),
          startTime: z.string().optional(),
          pickedTime: z.string().optional(),
          arrivedTime: z.string().optional(),
          deliveryTime: z.string().optional(),
          failedDeliveryTime: z.string().optional(),
          carrierLatitude: z.number().optional(),
          carrierLongitude: z.number().optional(),
          estimatedTimeInMinutes: z.string().optional(),
          pickUpTime: z.string().optional(),
          travelDistance: z.string().optional(),
          travelDistanceTime: z.string().optional()
        })
        .optional()
        .describe('Real-time tracking data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    let result = await client.getOrderDeliveryProgress(
      ctx.input.trackingId,
      ctx.input.includeStaticData ?? true
    );

    let fixedData = result.fixedData
      ? {
          orderNumber: result.fixedData?.order?.orderNumber,
          customerName: result.fixedData?.customer?.name,
          customerAddress: result.fixedData?.customer?.address,
          customerLatitude: result.fixedData?.customer?.latitude,
          customerLongitude: result.fixedData?.customer?.longitude,
          restaurantName: result.fixedData?.restaurant?.name,
          restaurantAddress: result.fixedData?.restaurant?.address,
          restaurantLatitude: result.fixedData?.restaurant?.latitude,
          restaurantLongitude: result.fixedData?.restaurant?.longitude,
          carrierName: result.fixedData?.carrier?.name,
          carrierPhone: result.fixedData?.carrier?.phoneNumber,
          carrierImageUrl: result.fixedData?.carrier?.imagePath,
          isExpired: result.fixedData?.isExpired
        }
      : undefined;

    let dynamicData = result.dynamicData
      ? {
          status: result.dynamicData?.orderStatus?.status,
          startTime: result.dynamicData?.orderStatus?.startTime,
          pickedTime: result.dynamicData?.orderStatus?.pickedTime,
          arrivedTime: result.dynamicData?.orderStatus?.arrivedTime,
          deliveryTime: result.dynamicData?.orderStatus?.deliveryTime,
          failedDeliveryTime: result.dynamicData?.orderStatus?.failedDeliveryTime,
          carrierLatitude: result.dynamicData?.carrierLocation?.latitude,
          carrierLongitude: result.dynamicData?.carrierLocation?.longitude,
          estimatedTimeInMinutes:
            result.dynamicData?.detailEta?.estimatedTimeInMinutes ??
            result.dynamicData?.estimatedTimeInMinutes,
          pickUpTime: result.dynamicData?.detailEta?.pickUpTime,
          travelDistance: result.dynamicData?.detailEta?.travelDistance,
          travelDistanceTime: result.dynamicData?.detailEta?.travelDistanceTime
        }
      : undefined;

    let statusText = dynamicData?.status ?? 'unknown';
    let etaText = dynamicData?.estimatedTimeInMinutes
      ? `ETA: ${dynamicData.estimatedTimeInMinutes} minutes`
      : '';

    return {
      output: { fixedData, dynamicData },
      message:
        `Tracking order **${ctx.input.trackingId}**: Status is **${statusText}**. ${etaText}`.trim()
    };
  })
  .build();
