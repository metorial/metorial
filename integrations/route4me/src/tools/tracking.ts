import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrackingHistory = SlateTool.create(spec, {
  name: 'Get Tracking History',
  key: 'get_tracking_history',
  description: `Retrieve GPS tracking history for a specific route. Returns the recorded location data points for the device that was tracked on the route.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID to get tracking history for')
    })
  )
  .output(
    z.object({
      routeId: z.string().describe('Route ID'),
      trackingHistory: z
        .array(
          z.object({
            lat: z.number().optional().describe('Latitude'),
            lng: z.number().optional().describe('Longitude'),
            speed: z.number().optional().describe('Speed at this point'),
            timestamp: z.number().optional().describe('Unix timestamp'),
            heading: z.number().optional().describe('Heading direction')
          })
        )
        .describe('GPS tracking data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTrackingHistory(ctx.input.routeId);
    let history = result.tracking_history || [];

    return {
      output: {
        routeId: ctx.input.routeId,
        trackingHistory: history.map((h: any) => ({
          lat: h.lat,
          lng: h.lng,
          speed: h.speed,
          timestamp: h.s,
          heading: h.d
        }))
      },
      message: `Retrieved ${history.length} tracking data point(s) for route **${ctx.input.routeId}**.`
    };
  })
  .build();

export let setGpsPosition = SlateTool.create(spec, {
  name: 'Set GPS Position',
  key: 'set_gps_position',
  description: `Report a GPS position for a device. Used to update the current location of a driver/device for real-time tracking.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID the device is currently on'),
      memberId: z.number().describe('Member ID of the driver'),
      lat: z.number().describe('Current latitude'),
      lng: z.number().describe('Current longitude'),
      course: z.number().optional().describe('Direction of travel in degrees'),
      speed: z.number().optional().describe('Current speed'),
      deviceType: z
        .string()
        .optional()
        .describe('Device type: iphone, android, ipad, android_tablet'),
      deviceGuid: z.string().optional().describe('Unique device identifier')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether position was recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      route_id: ctx.input.routeId,
      member_id: ctx.input.memberId,
      lat: ctx.input.lat,
      lng: ctx.input.lng,
      course: ctx.input.course || 0,
      speed: ctx.input.speed || 0,
      device_type: ctx.input.deviceType || 'iphone',
      device_guid: ctx.input.deviceGuid || '',
      format: 'json'
    };

    await client.setGps(body);

    return {
      output: { success: true },
      message: `Set GPS position (${ctx.input.lat}, ${ctx.input.lng}) for member **${ctx.input.memberId}** on route **${ctx.input.routeId}**.`
    };
  })
  .build();
