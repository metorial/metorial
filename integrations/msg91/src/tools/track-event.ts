import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Track user events in MSG91 Segmento for contact activity tracking and user journey analysis. Events can be used to trigger automated campaigns and workflows.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      events: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of event objects with event data (e.g., [{"event": "purchase", "mobile": "919XXXXXXXXX", "amount": 100}])'
        )
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.trackEvent({
      events: ctx.input.events
    });

    return {
      output: { response: result },
      message: `Tracked **${ctx.input.events.length}** event(s) in Segmento.`
    };
  })
  .build();
