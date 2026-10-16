import { SlateTool } from 'slates';
import { z } from 'zod';
import { checked, SensiboClient } from '../lib/client';
import { spec } from '../spec';

let outputSchema = z.object({
  sensorId: z.string(),
  events: z.array(
    z.object({
      timestamp: z.string().optional(),
      event: z.enum(['opened', 'closed']).optional(),
      raw: z.record(z.string(), z.any())
    })
  )
});

export let getDoorSensorHistoryTool = SlateTool.create(spec, {
  name: 'Get Door Sensor History',
  key: 'get_door_sensor_history',
  description:
    'Read opened and closed events for a Sensibo Door/Window Sensor using its ds_ sensor ID.',
  instructions: [
    'Use a door sensor ID starting with ds_, rather than the paired climate device ID. The public API does not document a dedicated door sensor discovery endpoint.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sensorId: z
        .string()
        .describe('Door sensor ID starting with ds_, obtained from the device configuration'),
      days: z
        .number()
        .min(1)
        .max(7)
        .optional()
        .describe(
          'Whole number of days of history, from 1 to 7; defaults to 1. Availability depends on the provider.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let events = await client.getDoorSensorHistory(ctx.input.sensorId, ctx.input.days ?? 1);
    return {
      output: checked(
        outputSchema,
        {
          sensorId: client.sanitize(ctx.input.sensorId),
          events: events.map(event => ({
            timestamp: event.timestamp,
            event: event.event,
            raw: event
          }))
        },
        'door sensor history'
      ),
      message: `Retrieved **${events.length}** door sensor event(s).`
    };
  })
  .build();
