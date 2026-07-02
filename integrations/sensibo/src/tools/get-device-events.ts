import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let eventSchema = z.object({
  eventId: z.string().optional().describe('Unique event identifier'),
  eventType: z
    .string()
    .optional()
    .describe('Type of event (e.g. acStateChange, scheduleChange, climateReactTrigger)'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp of the event'),
  reason: z.string().optional().describe('Reason or cause for the event'),
  acState: z
    .object({
      on: z.boolean().optional(),
      mode: z.string().optional(),
      targetTemperature: z.number().optional(),
      fanLevel: z.string().optional()
    })
    .optional()
    .describe('AC state associated with the event'),
  triggeredBy: z
    .string()
    .optional()
    .describe('What triggered the event (user, schedule, climateReact, etc.)')
});

export let getDeviceEventsTool = SlateTool.create(spec, {
  name: 'Get Device Events',
  key: 'get_device_events',
  description: `Retrieve historical events for a Sensibo device. Events include AC state changes, schedule triggers, Climate React triggers, geofence events, motion detection events, and more. Useful for auditing what happened and when.`,
  constraints: [
    'Events are available for a configurable number of past days (default 1, max 7).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
      days: z
        .number()
        .min(1)
        .max(7)
        .optional()
        .describe('Number of days of history to retrieve (1-7, default 1)')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('The device events belong to'),
      events: z.array(eventSchema).describe('List of device events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let days = ctx.input.days ?? 1;

    let rawEvents = await client.getDeviceEvents(ctx.input.deviceId, days);

    let events = (rawEvents || []).map((e: any) => ({
      eventId: e.id,
      eventType: e.type || e.reason,
      timestamp: e.time?.time || e.timestamp,
      reason: e.reason,
      acState: e.acState
        ? {
            on: e.acState.on,
            mode: e.acState.mode,
            targetTemperature: e.acState.targetTemperature,
            fanLevel: e.acState.fanLevel
          }
        : undefined,
      triggeredBy: e.causedByUser?.firstName || e.trigger?.type || e.source
    }));

    return {
      output: {
        deviceId: ctx.input.deviceId,
        events
      },
      message: `Retrieved **${events.length}** event(s) from device **${ctx.input.deviceId}** over the last ${days} day(s).`
    };
  })
  .build();
