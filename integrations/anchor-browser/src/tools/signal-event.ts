import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let signalEvent = SlateTool.create(spec, {
  name: 'Signal Event',
  key: 'signal_event',
  description: `Send a named event with a custom data payload to an active browser session. Useful for injecting external data (e.g. MFA codes, dynamic values) into a running browser automation workflow.`
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the active session to signal'),
      eventName: z.string().describe('Name of the event to signal'),
      eventData: z
        .record(z.string(), z.unknown())
        .describe('Data payload to send with the event')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.signalEvent(ctx.input.sessionId, ctx.input.eventName, ctx.input.eventData);

    return {
      output: { success: true },
      message: `Signaled event **${ctx.input.eventName}** to session **${ctx.input.sessionId}**.`
    };
  })
  .build();
