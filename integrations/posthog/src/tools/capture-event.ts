import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireProjectToken } from '../lib/helpers';
import { spec } from '../spec';

let eventSchema = z.object({
  distinctId: z.string().describe('Unique identifier for the user or device'),
  event: z
    .string()
    .describe('Event name (e.g. "$pageview", "$screen", or a custom event name)'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional properties to attach to the event'),
  timestamp: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp for the event. Defaults to current time.'),
  set: z
    .record(z.string(), z.any())
    .optional()
    .describe('Person properties to set (equivalent to $set)'),
  setOnce: z
    .record(z.string(), z.any())
    .optional()
    .describe('Person properties to set only if not already set (equivalent to $set_once)')
});

export let captureEventTool = SlateTool.create(spec, {
  name: 'Capture Event',
  key: 'capture_event',
  description: `Send one or more events to PostHog. Supports single event capture or batch capture of multiple events.
Use this to track pageviews, custom events, screen views, identify users (\`$identify\`), create aliases (\`$create_alias\`), or send any custom event.
Person properties can be set or updated via the \`set\` and \`setOnce\` fields.`,
  instructions: [
    'Requires a project token (configured in auth). The personal API key alone is not sufficient for event capture.',
    'For identifying users, use event name "$identify" with the desired properties in "set".'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      events: z.array(eventSchema).min(1).describe('One or more events to capture')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the capture request'),
      eventCount: z.number().describe('Number of events sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let apiKey = requireProjectToken(ctx.auth);

    if (ctx.input.events.length === 1) {
      let evt = ctx.input.events[0]!;
      await client.captureEvent({
        apiKey,
        distinctId: evt.distinctId,
        event: evt.event,
        properties: evt.properties,
        timestamp: evt.timestamp,
        set: evt.set,
        setOnce: evt.setOnce
      });
    } else {
      await client.captureBatch({
        apiKey,
        events: ctx.input.events.map(e => ({
          distinctId: e.distinctId,
          event: e.event,
          properties: e.properties,
          timestamp: e.timestamp,
          set: e.set,
          setOnce: e.setOnce
        }))
      });
    }

    return {
      output: {
        status: 'ok',
        eventCount: ctx.input.events.length
      },
      message: `Captured **${ctx.input.events.length}** event(s) successfully.`
    };
  })
  .build();
