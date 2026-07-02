import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMachineEvents = SlateTool.create(spec, {
  name: 'List Machine Events',
  key: 'list_machine_events',
  description:
    'List recent events for a Fly Machine. Use this to inspect lifecycle operations, failures, and API actions associated with one machine.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the Fly Machine'),
      limit: z.number().optional().describe('Number of events to fetch, max 50')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().describe('Event ID'),
            type: z.string().describe('Event type'),
            status: z.string().describe('Event status'),
            source: z.string().describe('Event source'),
            timestamp: z.number().describe('Unix timestamp'),
            request: z.record(z.string(), z.any()).describe('Request details when present')
          })
        )
        .describe('Machine events')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let events = await client.listMachineEvents(ctx.input.appName, ctx.input.machineId, {
      limit: ctx.input.limit
    });

    return {
      output: { events },
      message: `Found **${events.length}** event(s) for machine **${ctx.input.machineId}**.`
    };
  })
  .build();
