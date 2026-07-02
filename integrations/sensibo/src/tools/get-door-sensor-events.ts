import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let doorSensorEventSchema = z.object({
  eventId: z.string().optional().describe('Unique event identifier'),
  state: z.string().optional().describe('Sensor state (open or closed)'),
  timestamp: z.string().optional().describe('ISO 8601 timestamp of the event')
});

export let getDoorSensorEventsTool = SlateTool.create(spec, {
  name: 'Get Door Sensor Events',
  key: 'get_door_sensor_events',
  description: `Retrieve open/close events from a Sensibo Door/Window Sensor. Returns timestamped state transitions showing when the door or window was opened or closed.`,
  constraints: [
    'Events are available for a configurable number of past days (default 1, max 7).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deviceId: z
        .string()
        .describe('The unique ID of the Sensibo device with a door/window sensor'),
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
      deviceId: z.string().describe('The device the sensor belongs to'),
      events: z.array(doorSensorEventSchema).describe('List of door/window sensor events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let days = ctx.input.days ?? 1;

    let rawEvents = await client.getDoorSensorEvents(ctx.input.deviceId, days);

    let events = (rawEvents || []).map((e: any) => ({
      eventId: e.id,
      state: e.state,
      timestamp: e.time?.time || e.timestamp
    }));

    return {
      output: {
        deviceId: ctx.input.deviceId,
        events
      },
      message: `Retrieved **${events.length}** door/window sensor event(s) from device **${ctx.input.deviceId}** over the last ${days} day(s).`
    };
  })
  .build();
