import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import {
  child,
  fail,
  measure,
  optionalBoolean,
  optionalNumber,
  optionalString
} from '../lib/validation';
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
          orderNumber: z.string().nullish(),
          customerName: z.string().nullish(),
          customerAddress: z.string().nullish(),
          customerLatitude: z.number().nullish(),
          customerLongitude: z.number().nullish(),
          restaurantName: z.string().nullish(),
          restaurantAddress: z.string().nullish(),
          restaurantLatitude: z.number().nullish(),
          restaurantLongitude: z.number().nullish(),
          carrierName: z.string().nullish(),
          carrierPhone: z.string().nullish(),
          carrierImageUrl: z.string().nullish(),
          isExpired: z.boolean().nullish()
        })
        .nullish()
        .describe('Static order details'),
      dynamicData: z
        .object({
          status: z.string().nullish(),
          startTime: z.string().nullish(),
          pickedTime: z.string().nullish(),
          arrivedTime: z.string().nullish(),
          deliveryTime: z.string().nullish(),
          failedDeliveryTime: z.string().nullish(),
          carrierLatitude: z.number().nullish(),
          carrierLongitude: z.number().nullish(),
          estimatedTimeInMinutes: z.union([z.string(), z.number()]).nullish(),
          pickUpTime: z.union([z.string(), z.number()]).nullish(),
          travelDistance: z.union([z.string(), z.number()]).nullish(),
          travelDistanceTime: z.union([z.string(), z.number()]).nullish()
        })
        .nullish()
        .describe('Real-time tracking data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    let result = await client.getOrderDeliveryProgress(
      ctx.input.trackingId,
      ctx.input.includeStaticData ?? true
    );

    if (result.fixedData == null && result.dynamicData == null)
      fail('Shipday did not return tracking data. Check the tracking identifier and plan.');
    const fixed = child(result.fixedData),
      dynamic = child(result.dynamicData);
    const order = child(fixed.order),
      customer = child(fixed.customer),
      restaurant = child(fixed.restaurant),
      carrier = child(fixed.carrier);
    const state = child(dynamic.orderStatus),
      location = child(dynamic.carrierLocation),
      eta = child(dynamic.detailEta);
    const fixedData =
      result.fixedData == null
        ? undefined
        : {
            orderNumber: optionalString(order.orderNumber),
            customerName: optionalString(customer.name),
            customerAddress: optionalString(customer.address),
            customerLatitude: optionalNumber(customer.latitude),
            customerLongitude: optionalNumber(customer.longitude),
            restaurantName: optionalString(restaurant.name),
            restaurantAddress: optionalString(restaurant.address),
            restaurantLatitude: optionalNumber(restaurant.latitude),
            restaurantLongitude: optionalNumber(restaurant.longitude),
            carrierName: optionalString(carrier.name),
            carrierPhone: optionalString(carrier.phoneNumber),
            carrierImageUrl: optionalString(carrier.imagePath),
            isExpired: optionalBoolean(fixed.isExpired)
          };
    const dynamicData =
      result.dynamicData == null
        ? undefined
        : {
            status: optionalString(state.status),
            startTime: optionalString(state.startTime),
            pickedTime: optionalString(state.pickedTime),
            arrivedTime: optionalString(state.arrivedTime),
            deliveryTime: optionalString(state.deliveryTime),
            failedDeliveryTime: optionalString(state.failedDeliveryTime),
            carrierLatitude: optionalNumber(location.latitude),
            carrierLongitude: optionalNumber(location.longitude),
            estimatedTimeInMinutes: measure(
              eta.estimatedTimeInMinutes ?? dynamic.estimatedTimeInMinutes
            ),
            pickUpTime: measure(eta.pickUpTime),
            travelDistance: measure(eta.travelDistance),
            travelDistanceTime: measure(eta.travelDistanceTime)
          };

    let statusText = dynamicData?.status ?? 'unknown';
    let etaText = dynamicData?.estimatedTimeInMinutes
      ? `ETA: ${dynamicData.estimatedTimeInMinutes} minutes`
      : '';

    return {
      output: { fixedData, dynamicData },
      message: `Shipday tracking status is **${statusText}**. ${etaText}`.trim()
    };
  })
  .build();
